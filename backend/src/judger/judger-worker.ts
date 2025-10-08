import { parentPort, workerData } from 'worker_threads';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { Problem, IProblem } from '../mongoose/schemas/problems';
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
  for (const file of submission.userSolution) {
    const filename = file.filename;
    const content = file.content;
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
      await box.copyToBox(`${checkerDir}/*`);

      const metaFile = path.join(workDir, 'checker-compile.meta');

      // Compile checker inside isolate
      await box.run('if [ ! -f checker.exe ]; then make; fi', {
        processes: 20,
        timeLimit: 10,
        wallTimeLimit: 20,
        memoryLimit: 512000,
        metaFile,
        stderr: 'checker-compile.error',
        fullEnv: true
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

      const message = fs.readFileSync(path.join(boxDir, path.basename(checkerErrorFile)), 'utf-8').trim();

      const metaContent = fs.readFileSync(metaFile, 'utf-8');
      const exitCodeMatch = metaContent.match(/exitcode:(\d+)/);
      const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : -1;

      let status: SubmissionStatus;
      switch (exitCode) {
        case 0:
          status = SubmissionStatus.AC;
          break;
        case 1:
          status = SubmissionStatus.WA;
          break;
        case 2:
          status = SubmissionStatus.PE;
          break;
        default:
          status = SubmissionStatus.SE;
      }

      return { status, message };
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

  const problemID = submission.problemID;
  const problemMeta = await Problem.findOne({ problemID: problemID });
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
        processes: problemMeta.processes + 1 + (isCompiledLanguage ? 0 : 2),
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
      console.error(`Checker not found for problem ${submission.problemID}`);
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
): Promise<{ finalStatus: SubmissionStatus, score: number, testCaseResults: TestCaseResult[] }> => {
  const problemID = submission.problemID;
  const problemMeta = await Problem.findOne({ problemID });
  const problemDir = path.join('problems', problemID);

  const checkerCompiled = await compileChecker(problemDir, workDir);
  if (!checkerCompiled) {
    return { finalStatus: SubmissionStatus.SE, score: 0, testCaseResults: [] };
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
      console.log(`Generating test cases for ${problemID} in isolated environment`);

      await IsolateManager.withBox(async (box) => {
        const genBoxDir = box.getBoxDir();

        // Copy entire problem directory to isolated box
        await box.copyToBox(`${problemDir}/*`);

        const genMetaFile = path.join(workDir, 'tps-gen.meta');

        // Run tps gen inside isolate with generous limits
        await box.run('tps gen', {
          processes: 50,
          timeLimit: 600,
          wallTimeLimit: 3600,
          memoryLimit: 2048000,
          metaFile: genMetaFile,
          stderr: 'tps-gen.error',
          fullEnv: true,
          dirs: ['/usr/bin', '/bin', '/lib', '/lib64', '/etc'],
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
          console.log(`Test cases generated and copied successfully for ${problemID}`);
        } else {
          throw new Error('Tests directory not generated by tps gen');
        }
      });
    } catch (genError) {
      console.error(`Failed to generate testcases in isolated environment for ${problemDir}:`, genError);
      return { finalStatus: SubmissionStatus.SE, score: 0, testCaseResults: [] };
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

  for (const [subtaskName, subtaskInfo] of Object.entries<any>(subtasks.subtasks)) {
    const cases = subtaskTestCases.get(subtaskName);
    if (!cases) continue;

    let subtaskOk = true;
    for (const testcaseName of cases) {
      const result = resultsByTestCase.get(testcaseName);
      if (!result || result.status !== SubmissionStatus.AC) {
        subtaskOk = false;
        if (finalStatus === SubmissionStatus.AC) {
          finalStatus = result?.status || SubmissionStatus.SE;
        }
        break;
      }
    }

    if (subtaskOk) {
      totalScore += subtaskInfo.score;
    }
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

  return { finalStatus, score: totalScore, testCaseResults };
}

const compileUserSolution = async (submission: ISubmission, workDir: string): Promise<SubmissionStatus> => {
  const metaFile = path.join(workDir, 'compile.meta');
  const boxCompileCommand = languageSupport[submission.language as keyof typeof languageSupport].compileCommand;

  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();
    const boxID = box.getBoxID();

    try {
      // Write user solution to box
      writeUserSolution(submission, boxDir);
    } catch (error) {
      console.error(`Failed to write files to box ${boxID}:`, error);
      return SubmissionStatus.SE;
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

      const executablePath = path.join(boxDir, 'main');
      const targetPath = path.join(workDir, 'main.exe');
      if (fs.existsSync(executablePath)) {
        fs.copyFileSync(executablePath, targetPath);
        fs.chmodSync(targetPath, 0o755);
        console.log(`[${workDir}] Compilation successful, executable copied`);
        return SubmissionStatus.QU;
      }
      return SubmissionStatus.CE;
    } catch (error) {
      console.error(`[${workDir}] Compilation failed:`, error);
      return SubmissionStatus.CE;
    }
  });
};

const processSubmission = async (submissionID: string): Promise<void> => {
  try {
    const submission = await Submission.findById(submissionID);
    if (!submission) {
      throw new Error(`Submission ${submissionID} not found`);
    }

    const problem = await Problem.findOne({ problemID: submission.problemID });
    if (!problem) {
      throw new Error(`Problem ${submission.problemID} not found`);
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
        const result = await compileUserSolution(submission, workDir);
        if (result === SubmissionStatus.CE) {
          submission.status = SubmissionStatus.CE;
          await submission.save();
          return;
        }
        isCompiledLanguage = true;
      }
      const { finalStatus, score, testCaseResults } = await runAllTests(submission, workDir, isCompiledLanguage);
      submission.status = finalStatus;
      submission.score = score;
      submission.results = testCaseResults;
      await submission.save();
    } catch (error) {
      console.error('Error during worker execution:', error);
      submission.status = SubmissionStatus.SE;
      await submission.save();
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