import { parentPort, workerData } from 'worker_threads';
import { updateContestStanding } from '../utils/standing-utils';
import { Submission, ISubmission, IGroupResult } from '../mongoose/schemas/submission';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { User } from '../mongoose/schemas/users';
import languageSupport from '../utils/language-support';
import { hashString } from '../utils/hash-password';
import { SubmissionStatus } from '../utils/submission-status';
import { IsolateManager } from '../utils/isolate-manager';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';

const execAsync = promisify(exec);

if (workerData && typeof workerData.workerId === 'number') {
  const start = workerData.workerId * 100;
  const end = start + 100;
  IsolateManager.setBoxIdRange(start, end);
  console.log(`Worker ${workerData.workerId} initialized with box range ${start}-${end}`);
}

interface TestCaseResult {
  testcase: string;
  status: SubmissionStatus;
  time: number;
  memory: number;
  message?: string;
}

interface WorkerMessage {
  type: 'process_submission';
  submissionID: string;
}

interface WorkerResponse {
  type: 'submission_complete' | 'worker_ready' | 'error';
  submissionID?: string;
  error?: string;
}

const writeUserSolution = (submission: ISubmission, dir: string) => {
  for (let i = 0; i < submission.userSolution.length; i++) {
    console.log(`Writing user solution file ${i}`);
    const file = submission.userSolution[i];
    const content = file.content;
    // Use the filename provided in the submission, but ensure it's just the basename for security
    const filename = path.basename(file.filename);
    fs.writeFileSync(path.join(dir, filename), content);
  }
}

const compileChecker = async (problemDir: string, workDir: string): Promise<boolean> => {
  const checkerDir = path.join(problemDir, 'checker');
  const checkerExecutablePath = path.join(workDir, 'checker.exe');

  if (!fs.existsSync(checkerDir)) {
    console.error(`Checker directory not found for problem in ${problemDir}`);
    return false;
  }

  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();
    const boxID = box.getBoxID();

    try {
      // Copy checker directory to isolated box
      await box.copyToBox(checkerDir);

      const metaFile = path.join(workDir, 'checker-compile.meta');

      // Compile checker inside isolate
      await box.run('if [ ! -f checker.exe ]; then make; fi', {
        processes: 20,
        timeLimit: 10,
        wallTimeLimit: 20,
        memoryLimit: 512000,
        metaFile,
        stderr: 'checker-compile.error',
        fullEnv: true,
        dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])]
      }, 25000);

      // Copy error file and executable back
      const errorFilePath = path.join(boxDir, 'checker-compile.error');
      if (fs.existsSync(errorFilePath)) {
        fs.copyFileSync(errorFilePath, path.join(workDir, 'checker-compile.error'));
      }

      const compiledCheckerPath = path.join(boxDir, 'checker.exe');
      if (fs.existsSync(compiledCheckerPath)) {
        fs.copyFileSync(compiledCheckerPath, checkerExecutablePath);
        fs.chmodSync(checkerExecutablePath, 0o755);
        console.log(`[${workDir}] Checker compilation successful`);
        return true;
      } else {
        console.error(`[${workDir}] Checker compilation failed, executable not found.`);
        return false;
      }
    } catch (error) {
      console.error(`[${workDir}] Checker compilation failed:`, error);
      return false;
    }
  });
};

const runChecker = async (
  checkerPath: string,
  inputFile: string,
  userOutputFile: string,
  answerFile: string,
  workDir: string
): Promise<{ status: SubmissionStatus; message: string }> => {
  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();

    try {
      // Copy files to box
      fs.copyFileSync(checkerPath, path.join(boxDir, 'checker'));
      fs.chmodSync(path.join(boxDir, 'checker'), 0o755);
      fs.copyFileSync(inputFile, path.join(boxDir, 'input.in'));
      fs.copyFileSync(userOutputFile, path.join(boxDir, 'user.out'));
      fs.copyFileSync(answerFile, path.join(boxDir, 'answer.out'));
    } catch (error) {
      console.error(`Failed to copy files to box:`, error);
      return { status: SubmissionStatus.SE, message: `Box setup error: ${error}` };
    }

    const baseName = path.basename(inputFile).replace('.in', '');
    const metaFile = path.join(workDir, `checker-${baseName}.meta`);
    const checkerOutputFile = `checker-${baseName}.out`;
    const checkerErrorFile = `checker-${baseName}.err`;

    try {
      await box.run('./checker input.in user.out answer.out', {
        processes: 1,
        timeLimit: 10,
        wallTimeLimit: 20,
        memoryLimit: 512000,
        metaFile,
        stdout: checkerOutputFile,
        stderr: checkerErrorFile
      }, 25000);

      // Read checker message from stderr (inside the box)
      const checkerErrorPath = path.join(boxDir, checkerErrorFile);
      let message = '';
      if (fs.existsSync(checkerErrorPath)) {
        message = fs.readFileSync(checkerErrorPath, 'utf-8').trim();
      }

      // Read score from stdout
      const checkerOutputPath = path.join(boxDir, checkerOutputFile);
      let score = 0;
      if (fs.existsSync(checkerOutputPath)) {
        const scoreStr = fs.readFileSync(checkerOutputPath, 'utf-8').trim();
        score = parseFloat(scoreStr);
      }

      // Determine status based on score
      if (!isNaN(score)) {
        if (score === 0) {
          return { status: SubmissionStatus.WA, message };
        }
        if (score > 0 && score < 1) {
          return { status: SubmissionStatus.PS, message };
        }
        return { status: SubmissionStatus.AC, message };
      }

      return { status: SubmissionStatus.SE, message: 'Invalid score from checker' };
    } catch (error) {
      console.error('Checker execution error:', error);
      return { status: SubmissionStatus.SE, message: `Checker error: ${error}` };
    }
  });
};

const runUserSolution = async (
  submission: ISubmission,
  testcaseInput: string,
  testcaseOutput: string,
  workDir: string,
  isCompiledLanguage: boolean
): Promise<TestCaseResult> => {
  const userOutputFile = path.join(workDir, 'user.out');
  const userErrorFile = path.join(workDir, 'user.error');
  const metaFile = path.join(workDir, 'run.meta');

  const problemSerialNumber = submission.problemSerialNumber;
  const problemMeta = await Problem.findOne({ serialNumber: problemSerialNumber });
  if (!problemMeta) {
    throw new Error('Problem not found');
  }

  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();

    try {
      // Copy files to box
      if (isCompiledLanguage) {
        fs.copyFileSync(path.join(workDir, 'main.exe'), path.join(boxDir, 'main.exe'));
      } else {
        writeUserSolution(submission, boxDir);
      }
      fs.copyFileSync(testcaseInput, path.join(boxDir, path.basename(testcaseInput)));
    } catch (error) {
      console.error(`Failed to copy files to box:`, error);
      return {
        testcase: path.basename(testcaseInput, '.in'),
        status: SubmissionStatus.SE,
        time: 0,
        memory: 0,
        message: `Box setup error: ${error}`
      };
    }

    const executeCommand = languageSupport[submission.language as keyof typeof languageSupport].executeCommand;

    try {
      await box.run(executeCommand, {
        processes: problemMeta.processes + (isCompiledLanguage ? 0 : 2),
        timeLimit: problemMeta.timeLimit,
        wallTimeLimit: problemMeta.timeLimit,
        memoryLimit: problemMeta.memoryLimit * 1024,
        metaFile,
        stdin: path.basename(testcaseInput),
        stdout: path.basename(userOutputFile),
        stderr: path.basename(userErrorFile)
      }, (problemMeta.timeLimit + 1) * 1000);
    } catch (error) {
      console.error(`[${workDir}] Execution failed:`, error);
    }

    // Compare user output with expected output
    const metaContent = fs.readFileSync(metaFile, 'utf-8');
    const meta: { [key: string]: string } = {};
    metaContent.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        meta[parts[0]] = parts[1].trim();
      }
    });

    const baseResult = {
      testcase: path.basename(testcaseInput, '.in'),
      time: parseFloat(meta['time-wall'] || '0'),
      memory: parseInt(meta['cg-mem'] || '0', 10),
      message: ''
    };

    if (meta.status) {
      switch (meta.status) {
        case 'TO':
          return { ...baseResult, status: SubmissionStatus.TLE };
        case 'ML':
          return { ...baseResult, status: SubmissionStatus.MLE };
        case 'RE':
        case 'SG':
          return { ...baseResult, status: SubmissionStatus.RE };
        default:
          return { ...baseResult, status: SubmissionStatus.SE };
      }
    }

    fs.copyFileSync(path.join(boxDir, path.basename(userOutputFile)), userOutputFile);
    fs.copyFileSync(path.join(boxDir, path.basename(userErrorFile)), userErrorFile);

    const checkerPath = path.join(workDir, 'checker.exe');
    if (!fs.existsSync(checkerPath)) {
      console.error(`Checker not found for problem ${submission.problemSerialNumber}`);
      return { ...baseResult, status: SubmissionStatus.SE };
    }

    const { status: checkerResult, message: checkerMessage } = await runChecker(
      checkerPath,
      testcaseInput,
      userOutputFile,
      testcaseOutput,
      workDir
    );
    return { ...baseResult, status: checkerResult, message: checkerMessage };
  });
};

const runAllTests = async (
  submission: ISubmission,
  workDir: string,
  isCompiledLanguage: boolean
): Promise<{ finalStatus: SubmissionStatus, score: number, groupedResults: { [groupName: string]: IGroupResult }, time: number, memory: number }> => {
  const problemSerialNumber = submission.problemSerialNumber;
  const problemMeta = await Problem.findOne({ serialNumber: problemSerialNumber });
  const problemDir = path.join('problems', problemSerialNumber.toString());

  const checkerCompiled = await compileChecker(problemDir, workDir);
  if (!checkerCompiled) {
    console.log('Fail to compile checker');
    return { finalStatus: SubmissionStatus.SE, score: 0, groupedResults: {}, time: 0, memory: 0 };
  }

  const subtasksPath = fs.readFileSync(path.join(problemDir, 'subtasks.json'), 'utf-8');
  const subtasks = JSON.parse(subtasksPath);

  const testcasesConfigPath = path.join(problemDir, 'tests', 'mapping');

  // Generate test cases if mapping doesn't exist
  try {
    fs.accessSync(testcasesConfigPath, fs.constants.R_OK);
  } catch (error) {
    // Run tps gen in isolated environment for security using IsolateManager
    try {
      console.log(`Generating test cases for ${problemSerialNumber} in isolated environment`);

      await IsolateManager.withBox(async (box) => {
        const genBoxDir = box.getBoxDir();

        // Copy entire problem directory to isolated box
        await box.copyToBox(`${problemDir}/*`);

        const genMetaFile = path.join(workDir, 'tps-gen.meta');

        // Run tps gen inside isolate with generous limits
        await box.run('/usr/local/bin/tps gen', {
          processes: 50,
          timeLimit: 600,
          wallTimeLimit: 3600,
          memoryLimit: 2048000,
          metaFile: genMetaFile,
          stderr: 'tps-gen.error',
          fullEnv: true,
          dirs: ['/usr', '/bin', '/lib', '/etc'],
          cwd: '/box'
        }, 4000000);

        // Copy generated tests directory back to problem directory
        const generatedTestsDir = path.join(genBoxDir, 'tests');
        const targetTestsDir = path.join(problemDir, 'tests');

        if (fs.existsSync(generatedTestsDir)) {
          // Remove old tests directory if exists and copy new one
          if (fs.existsSync(targetTestsDir)) {
            fs.rmSync(targetTestsDir, { recursive: true, force: true });
          }
          await execAsync(`cp -r ${generatedTestsDir} ${targetTestsDir}`);
          console.log(`Test cases generated and copied successfully for ${problemSerialNumber}`);
        } else {
          throw new Error('Tests directory not generated by tps gen');
        }
      });
    } catch (genError) {
      console.error(`Failed to generate testcases in isolated environment for ${problemDir}:`, genError);
      return { finalStatus: SubmissionStatus.SE, score: 0, groupedResults: {}, time: 0, memory: 0 };
    }
  }
  const testcasesConfig = fs.readFileSync(testcasesConfigPath, 'utf-8');

  const subtaskTestCases = new Map<string, string[]>();

  for (const line of testcasesConfig.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const parts = trimmedLine.split(/\s+/);
    if (parts.length < 2) continue;

    const subtaskName = parts[0];
    const testcaseName = parts[1];

    if (!subtaskTestCases.has(subtaskName)) {
      subtaskTestCases.set(subtaskName, []);
    }
    subtaskTestCases.get(subtaskName)!.push(testcaseName);
  }

  // Also scan the tests directory to find all test cases (including dynamically generated ones)
  const testsDir = path.join(problemDir, 'tests');
  if (fs.existsSync(testsDir)) {
    const dirContents = fs.readdirSync(testsDir);
    const inputFiles = new Set<string>();
    
    for (const file of dirContents) {
      if (file.endsWith('.in')) {
        const testcaseName = file.slice(0, -3);
        inputFiles.add(testcaseName);
      }
    }

    // Merge directory scan results with mapping file results
    // For each testcase found in directory, add it to the subtask if not already there
    for (const testcaseName of inputFiles) {
      let foundInMapping = false;
      
      // Check if this testcase is already in the mapping
      for (const [subtaskName, cases] of subtaskTestCases.entries()) {
        if (cases.includes(testcaseName)) {
          foundInMapping = true;
          break;
        }
      }
      
      // If not in mapping, try to infer subtask from testcase name pattern (subtask-index format)
      if (!foundInMapping) {
        const testcaseParts = testcaseName.split('-');
        if (testcaseParts.length >= 1) {
          const inferredSubtask = testcaseParts[0];
          // If the inferred subtask exists in the subtasks, add it
          if (inferredSubtask in subtasks.subtasks) {
            if (!subtaskTestCases.has(inferredSubtask)) {
              subtaskTestCases.set(inferredSubtask, []);
            }
            subtaskTestCases.get(inferredSubtask)!.push(testcaseName);
          }
        }
      }
    }
  }

  const allTestCases = new Set<string>();
  for (const subtaskName of Object.keys(subtasks.subtasks)) {
    const cases = subtaskTestCases.get(subtaskName);
    if (cases) {
      cases.forEach(c => allTestCases.add(c));
    }
  }

  const testCaseResults: TestCaseResult[] = [];
  for (const testcase of allTestCases) {
    const inputFile = path.join(problemDir, 'tests', `${testcase}.in`);
    const outputFile = path.join(problemDir, 'tests', `${testcase}.out`);
    if (!fs.existsSync(inputFile) || !fs.existsSync(outputFile)) {
      console.error(`Missing input or output file for testcase ${testcase}`);
      testCaseResults.push({ testcase, status: SubmissionStatus.SE, time: 0, memory: 0, message: 'Missing test case files' });
      continue;
    }
    const result = await runUserSolution(submission, inputFile, outputFile, workDir, isCompiledLanguage);
    testCaseResults.push(result);
  }

  const resultsByTestCase = new Map(testCaseResults.map(r => [r.testcase, r]));
  let totalScore = 0;
  let finalStatus: SubmissionStatus = SubmissionStatus.AC;
  const groupedResults: { [groupName: string]: IGroupResult } = {};

  for (const [subtaskName, subtaskInfo] of Object.entries<any>(subtasks.subtasks)) {
    const cases = subtaskTestCases.get(subtaskName);
    if (!cases) continue;

    let subtaskOk = true;
    const groupTestCases: TestCaseResult[] = [];

    for (const testcaseName of cases) {
      const result = resultsByTestCase.get(testcaseName);
      if (result) {
        groupTestCases.push(result);
      }
      if (!result || result.status !== SubmissionStatus.AC) {
        subtaskOk = false;
        if (finalStatus === SubmissionStatus.AC) {
          finalStatus = result?.status || SubmissionStatus.SE;
        }
      }
    }

    const groupScore = subtaskOk ? subtaskInfo.score : 0;
    totalScore += groupScore;

    groupedResults[subtaskName] = {
      score: groupScore,
      testcases: groupTestCases
    };
  }

  if (totalScore === 0 && finalStatus === SubmissionStatus.AC) {
    if (testCaseResults.length > 0 && testCaseResults.every(r => r.status === SubmissionStatus.AC)) {
      finalStatus = SubmissionStatus.AC;
    } else if (testCaseResults.length > 0) {
      finalStatus = testCaseResults.find(r => r.status !== SubmissionStatus.AC)?.status || SubmissionStatus.WA;
    } else {
      finalStatus = SubmissionStatus.SE;
    }
  } else if (totalScore > 0 && totalScore < (problemMeta?.fullScore || 100)) {
    finalStatus = SubmissionStatus.PS;
  }

  // Calculate max time and memory
  let maxTime = 0;
  let maxMemory = 0;
  for (const r of testCaseResults) {
    if (r.time > maxTime) maxTime = r.time;
    if (r.memory > maxMemory) maxMemory = r.memory;
  }

  return { finalStatus, score: totalScore, groupedResults, time: maxTime, memory: maxMemory };
}

const compileUserSolution = async (submission: ISubmission, workDir: string): Promise<{ status: SubmissionStatus; errorMessage?: string }> => {
  const metaFile = path.join(workDir, 'compile.meta');
  let boxCompileCommand = languageSupport[submission.language as keyof typeof languageSupport].compileCommand;

  const problem = await Problem.findOne({ serialNumber: submission.problemSerialNumber });

  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();
    const boxID = box.getBoxID();

    if (problem?.hasGrader) {
      const graderDir = path.join('problems', submission.problemSerialNumber.toString(), 'grader', submission.language);
      if (fs.existsSync(graderDir)) {
        const files = fs.readdirSync(graderDir);
        for (const file of files) {
          fs.copyFileSync(path.join(graderDir, file), path.join(boxDir, file));
        }
        if (submission.language.startsWith('g++')) {
          boxCompileCommand = boxCompileCommand.replace('main.cpp', '*.cpp');
        } else if (submission.language.startsWith('gcc')) {
          boxCompileCommand = boxCompileCommand.replace('main.c', '*.c');
        }
      }
    }

    try {
      // Write user solution to box
      writeUserSolution(submission, boxDir);
    } catch (error) {
      console.error(`Failed to write files to box ${boxID}:`, error);
      return { status: SubmissionStatus.SE, errorMessage: `Failed to write files: ${error}` };
    }

    console.log('Running compilation command for box ID:', boxID);

    try {
      await box.run(boxCompileCommand, {
        processes: 20,
        timeLimit: 10,
        wallTimeLimit: 20,
        memoryLimit: 512000,
        metaFile,
        stderr: 'compile.error',
        fullEnv: true
      }, 25000);

      // Copy error file if it exists (for both success and failure cases)
      const errorFilePath = path.join(boxDir, 'compile.error');
      const targetErrorPath = path.join(workDir, 'compile.error');
      if (fs.existsSync(errorFilePath)) {
        fs.copyFileSync(errorFilePath, targetErrorPath);
      }

      const executablePath = path.join(boxDir, 'main');
      const targetPath = path.join(workDir, 'main.exe');
      if (fs.existsSync(executablePath)) {
        fs.copyFileSync(executablePath, targetPath);
        fs.chmodSync(targetPath, 0o755);
        console.log(`[${workDir}] Compilation successful, executable copied`);
        return { status: SubmissionStatus.QU };
      }

      // Compilation failed - read error message
      let errorMessage = '';
      if (fs.existsSync(targetErrorPath)) {
        errorMessage = fs.readFileSync(targetErrorPath, 'utf-8');
        console.log(`[${workDir}] Compilation error:\n${errorMessage}`);
      }

      return { status: SubmissionStatus.CE, errorMessage };
    } catch (error) {
      console.error(`[${workDir}] Compilation failed:`, error);

      // Try to get error message even on exception
      const errorFilePath = path.join(boxDir, 'compile.error');
      const targetErrorPath = path.join(workDir, 'compile.error');
      let errorMessage = '';

      if (fs.existsSync(errorFilePath)) {
        try {
          fs.copyFileSync(errorFilePath, targetErrorPath);
          errorMessage = fs.readFileSync(targetErrorPath, 'utf-8');
        } catch (readError) {
          console.error('Failed to read compilation error:', readError);
        }
      }

      return { status: SubmissionStatus.CE, errorMessage: errorMessage || `Compilation exception: ${error}` };
    }
  });
};

const processSubmission = async (submissionID: string): Promise<void> => {
  try {
    const submission = await Submission.findById(submissionID);
    console.log(`Processing submission ${submissionID}`);
    console.log(submission);
    if (!submission) {
      throw new Error(`Submission ${submissionID} not found`);
    }

    const problem = await Problem.findOne({ serialNumber: submission.problemSerialNumber });
    if (!problem) {
      throw new Error(`Problem ${submission.problemSerialNumber} not found`);
    }

    const user = await User.findOne({ username: submission.username });
    if (!user) {
      throw new Error(`User ${submission.username} not found`);
    }

    // Check if this is the user's first attempt on this problem
    const previousSubmissions = await Submission.countDocuments({
      username: submission.username,
      problemSerialNumber: submission.problemSerialNumber,
      _id: { $ne: submissionID } // Exclude current submission
    });

    const isFirstAttempt = previousSubmissions === 0;

    // If first attempt, update problem's attempted count
    if (isFirstAttempt) {
      problem.userDetail.attempted += 1;
      await problem.save();
    }

    submission.status = SubmissionStatus.QU;
    await submission.save();

    const workDir = path.join('judging', hashString(submissionID));
    fs.mkdirSync(workDir, { recursive: true });

    try {
      const langConfig = languageSupport[submission.language as keyof typeof languageSupport];
      if (!langConfig) {
        throw new Error('language not supported');
      }
      let isCompiledLanguage: boolean = false;
      if (langConfig.compileCommand !== '') {
        const { status: compileStatus, errorMessage } = await compileUserSolution(submission, workDir);
        if (compileStatus === SubmissionStatus.CE) {
          submission.status = SubmissionStatus.CE;

          // Log compilation error for debugging (but don't store in submission)
          if (errorMessage) {
            console.log(`[${workDir}] Detailed compilation error for submission ${submissionID}:`);
            console.log(errorMessage);
          }

          await submission.save();

          // Update submission statistics
          problem.submissionDetail.compilationError += 1;
          problem.submissionDetail.submitted += 1;
          await problem.save();
          await updateContestStanding(submission);
          return;
        }
        isCompiledLanguage = true;
      }
      const { finalStatus, score, groupedResults, time, memory } = await runAllTests(submission, workDir, isCompiledLanguage);
      submission.status = finalStatus;
      submission.score = score;
      submission.time = time;
      submission.memory = memory;
      submission.results = groupedResults;
      await submission.save();

      // Update submission statistics based on final status
      problem.submissionDetail.submitted += 1;

      switch (finalStatus) {
        case SubmissionStatus.AC:
          problem.submissionDetail.accepted += 1;

          // Check if this is the user's first AC on this problem
          const previousAC = await Submission.countDocuments({
            username: submission.username,
            problemSerialNumber: submission.problemSerialNumber,
            status: SubmissionStatus.AC,
            _id: { $ne: submissionID }
          });

          if (previousAC === 0) {
            // First time solving this problem
            problem.userDetail.solved += 1;
            await problem.save();

            // Update user statistics
            user.solvedProblem += 1;
            if (!user.solvedProblems.includes(submission.problemSerialNumber)) {
              user.solvedProblems.push(submission.problemSerialNumber);
            }
            await user.save();
          } else {
            await problem.save();
          }
          break;
        case SubmissionStatus.WA:
          problem.submissionDetail.wrongAnswer += 1;
          await problem.save();
          break;
        case SubmissionStatus.TLE:
          problem.submissionDetail.timeLimitExceeded += 1;
          await problem.save();
          break;
        case SubmissionStatus.MLE:
          problem.submissionDetail.memoryLimitExceeded += 1;
          await problem.save();
          break;
        case SubmissionStatus.RE:
          problem.submissionDetail.runtimeError += 1;
          await problem.save();
          break;
        case SubmissionStatus.PE:
          // PE doesn't have a specific counter, treat as wrong answer
          problem.submissionDetail.wrongAnswer += 1;
          await problem.save();
          break;
        default:
          // For SE, PS and other statuses
          await problem.save();
          break;
      }
      await updateContestStanding(submission);
    } catch (error) {
      console.error('Error during worker execution:', error);
      submission.status = SubmissionStatus.SE;
      await submission.save();

      // Update submission statistics for system error
      problem.submissionDetail.submitted += 1;
      await problem.save();
      await updateContestStanding(submission);
    } finally {
      // Clean up work directory
      fs.rmSync(workDir, { recursive: true, force: true });
    }

  } catch (error) {
    console.error('Error processing submission:', error);
    const submission = await Submission.findById(submissionID);
    if (submission) {
      submission.status = SubmissionStatus.SE;
      await submission.save();
    }
    throw error;
  }
};

// Worker message handling
if (parentPort) {
  // Connect to MongoDB using the connection string from worker data
  if (workerData?.mongoUri) {
    mongoose.connect(workerData.mongoUri);
  }

  parentPort.on('message', async (message: WorkerMessage) => {
    try {
      if (message.type === 'process_submission') {
        await processSubmission(message.submissionID);

        const response: WorkerResponse = {
          type: 'submission_complete',
          submissionID: message.submissionID
        };
        parentPort?.postMessage(response);
      }
    } catch (error) {
      const response: WorkerResponse = {
        type: 'error',
        submissionID: message.submissionID,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      parentPort?.postMessage(response);
    }
  });

  // Signal that worker is ready
  const readyResponse: WorkerResponse = { type: 'worker_ready' };
  parentPort.postMessage(readyResponse);
}