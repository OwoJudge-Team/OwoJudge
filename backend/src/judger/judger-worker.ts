import { parentPort, workerData } from 'worker_threads';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import languageSupport from '../utils/language-support';
import { hashString } from '../utils/hash-password';
import { SubmissionStatus } from '../utils/submission-status';
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

// Track used box IDs to prevent conflicts with atomic protection
const usedBoxIDs = new Set<number>();
const boxLocks = new Map<number, boolean>(); // Track locked boxes for extended operations
let boxIDCounter = Math.floor(Math.random() * 100); // Start from a random base
let boxIDMutex = false; // Simple mutex for atomic operations

// Atomic sleep function for mutex waiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// File-based locking for additional safety
const acquireBoxLock = async (boxID: number): Promise<void> => {
  const lockFile = `/tmp/judge-box-${boxID}.lock`;
  let attempts = 0;
  
  while (attempts < 100) { // Max 10 seconds wait
    try {
      // Try to create lock file exclusively (fails if exists)
      fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
      return; // Successfully acquired lock
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        // Lock file exists, check if process is still alive
        try {
          const pidStr = fs.readFileSync(lockFile, 'utf-8');
          const pid = parseInt(pidStr);
          
          // Check if process is still running
          process.kill(pid, 0); // Signal 0 checks existence without killing
          
          // Process exists, wait and retry
          await sleep(0.5);
          attempts++;
        } catch {
          // Process doesn't exist, remove stale lock and retry
          try {
            fs.unlinkSync(lockFile);
          } catch {}
        }
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to acquire lock for box ${boxID} after ${attempts} attempts`);
};

const releaseBoxLock = (boxID: number): void => {
  const lockFile = `/tmp/judge-box-${boxID}.lock`;
  try {
    fs.unlinkSync(lockFile);
  } catch (error) {
    console.warn(`Failed to release lock file for box ${boxID}:`, error);
  }
};

const getNextBoxID = async (): Promise<number> => {
  // Acquire mutex with exponential backoff
  while (boxIDMutex) {
    await sleep(Math.random() * 2 + 0.5); // Random wait 1-11ms to prevent thundering herd
  }
  boxIDMutex = true;
  
  try {
    let boxID: number;
    let attempts = 0;
    
    do {
      boxID = (boxIDCounter++) % 500; // Cycle through 0-499
      attempts++;
      
      // If we've tried all possible IDs, force cleanup and restart
      if (attempts > 500) {
        console.warn('All box IDs exhausted, forcing cleanup of all boxes');
        usedBoxIDs.clear();
        boxLocks.clear();
        boxIDCounter = Math.floor(Math.random() * 100);
        boxID = (boxIDCounter++) % 500;
        break;
      }
    } while (usedBoxIDs.has(boxID) || boxLocks.get(boxID)); // Also check if box is locked
    
    usedBoxIDs.add(boxID);
    boxLocks.set(boxID, true); // Lock the box for extended operations
    return boxID;
  } finally {
    // Always release mutex
    boxIDMutex = false;
  }
}

const releaseBoxID = async (boxID: number): Promise<void> => {
  // Acquire mutex for atomic delete
  while (boxIDMutex) {
    await sleep(Math.random() * 2 + 0.5); // Shorter wait for release
  }
  boxIDMutex = true;
  
  try {
    usedBoxIDs.delete(boxID);
    boxLocks.delete(boxID); // Also release the lock
  } finally {
    boxIDMutex = false;
  }
}

const cleanupBox = async (boxID: number) => {
  try {
    await execAsync(`isolate --box-id=${boxID} --cg --wait --cleanup`);
  } catch (error) {
    console.warn(`Failed to cleanup box ${boxID}:`, error);
  } finally {
    // Always release both file lock and box ID, even if cleanup failed
    releaseBoxLock(boxID);
    await releaseBoxID(boxID);
  }
}

const compileChecker = async (problemDir: string, workDir: string): Promise<boolean> => {
  const checkerDir = path.join(problemDir, 'checker');
  const checkerExecutablePath = path.join(workDir, 'checker.exe');

  if (!fs.existsSync(checkerDir)) {
    console.error(`Checker directory not found for problem in ${problemDir}`);
    return false;
  }

  const boxID = await getNextBoxID();
  let boxDir: string;
  
  try {
    // Acquire file system lock for this box
    await acquireBoxLock(boxID);
    
    const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxID} --cg --wait --init`);
    boxDir = path.join(boxPath.trim(), 'box');

    // Critical section: ensure atomic file operations
    await execAsync(`cp -r ${checkerDir}/* ${boxDir}`);
  } catch (error) {
    console.error(`Failed to initialize or copy checker directory to box ${boxID}:`, error);
    await cleanupBox(boxID);
    return false;
  }

  const metaFile = path.join(workDir, 'checker-compile.meta');
  const compileErrorFile = 'checker-compile.error';

  const isolateCommand = `isolate --box-id=${boxID} ` +
    `--cg ` +
    `--wait ` +
    `--time=10 ` +
    `--processes=20 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stderr=${compileErrorFile} ` +
    `--full-env ` +
    `--run -- /bin/bash -c "if [ ! -f checker.exe ]; then make; fi"`;

  try {
    await execAsync(isolateCommand, { timeout: 25000 });
    const compiledCheckerPath = path.join(boxDir, 'checker.exe');
    fs.copyFileSync(path.join(boxDir, 'checker-compile.error'), path.join(workDir, 'checker-compile.error'));
    if (fs.existsSync(compiledCheckerPath)) {
      fs.copyFileSync(compiledCheckerPath, checkerExecutablePath);
      fs.chmodSync(checkerExecutablePath, 0o755);
      console.log(`[${workDir}] Checker compilation successful`);
      await cleanupBox(boxID);
      return true;
    } else {
      console.error(`[${workDir}] Checker compilation failed, executable not found.`);
      await cleanupBox(boxID);
      return false;
    }
  } catch (error) {
    console.error(`[${workDir}] Checker compilation failed:`, error);
    await cleanupBox(boxID);
    return false;
  }
};

const runChecker = async (
  checkerPath: string,
  inputFile: string,
  userOutputFile: string,
  answerFile: string,
  workDir: string
): Promise<{ status: SubmissionStatus; message: string }> => {
  const boxID = await getNextBoxID();
  let boxDir: string;
  
  try {
    // Acquire file system lock for this box
    await acquireBoxLock(boxID);
    
    const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxID} --cg --wait --init`);
    boxDir = path.join(boxPath.trim(), 'box');

    // Critical section: ensure atomic file operations
    fs.copyFileSync(checkerPath, path.join(boxDir, 'checker'));
    fs.chmodSync(path.join(boxDir, 'checker'), 0o755);
    fs.copyFileSync(inputFile, path.join(boxDir, 'input.in'));
    fs.copyFileSync(userOutputFile, path.join(boxDir, 'user.out'));
    fs.copyFileSync(answerFile, path.join(boxDir, 'answer.out'));
  } catch (error) {
    console.error(`Failed to initialize or copy files to box ${boxID}:`, error);
    await cleanupBox(boxID);
    return { status: SubmissionStatus.SE, message: `Box setup error: ${error}` };
  }

  const baseName = path.basename(inputFile).replace('.in', '');
  const metaFile = path.join(workDir, `checker-${baseName}.meta`);
  const checkerOutputFile = `checker-${baseName}.out`;
  const checkerErrorFile = `checker-${baseName}.err`;

  const isolateCommand = `isolate --box-id=${boxID} ` +
    `--cg ` +
    `--wait ` +
    `--time=10 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stdout=${checkerOutputFile} ` +
    `--stderr=${checkerErrorFile} ` +
    `--run -- ./checker input.in user.out answer.out`;

  try {
    await execAsync(isolateCommand, { timeout: 25000 });
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

    await cleanupBox(boxID);
    return { status, message };
  } catch (error) {
    console.error('Checker execution error:', error);
    await cleanupBox(boxID);
    return { status: SubmissionStatus.SE, message: `Checker error: ${error}` };
  }
};

const runUserSolution = async (
  submission: ISubmission,
  testcaseInput: string,
  testcaseOutput: string,
  workDir: string,
  isCompiledLanguage: boolean
): Promise<TestCaseResult> => {
  const boxID = await getNextBoxID();
  const userOutputFile = path.join(workDir, 'user.out');
  const userErrorFile = path.join(workDir, 'user.error');
  const metaFile = path.join(workDir, 'run.meta');
  let boxDir: string;

  try {
    // Acquire file system lock for this box
    await acquireBoxLock(boxID);
    
    const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxID} --cg --wait --init`);
    boxDir = path.join(boxPath.trim(), 'box');

    // Critical section: ensure atomic file operations
    if (isCompiledLanguage) {
      fs.copyFileSync(path.join(workDir, 'main.exe'), path.join(boxDir, 'main.exe'));
    } else {
      writeUserSolution(submission, boxDir);
    }

    fs.copyFileSync(testcaseInput, path.join(boxDir, path.basename(testcaseInput)));
  } catch (error) {
    console.error(`Failed to initialize or copy files to box ${boxID}:`, error);
    await cleanupBox(boxID);
    return { 
      testcase: path.basename(testcaseInput, '.in'), 
      status: SubmissionStatus.SE, 
      time: 0, 
      memory: 0, 
      message: `Box setup error: ${error}` 
    };
  }

  const problemID = submission.problemID;
  const problemMeta = await Problem.findOne({ problemID: problemID });
  if (!problemMeta) {
    throw new Error('Problem not found');
  }

  const executeCommand = languageSupport[submission.language as keyof typeof languageSupport].executeCommand;
  const isolateCommand = `isolate --box-id=${boxID} ` +
    `--cg ` +
    `--wait ` +
    `--processes=${problemMeta.processes + 1 + (isCompiledLanguage ? 0 : 2)} ` +
    `--time=${problemMeta.timeLimit} ` +
    `--wall-time=${problemMeta.timeLimit} ` +
    `--mem=${problemMeta.memoryLimit * 1024} ` +
    `--meta=${metaFile} ` +
    `--stdin=${path.basename(testcaseInput)} ` +
    `--stdout=${path.basename(userOutputFile)} ` +
    `--stderr=${path.basename(userErrorFile)} ` +
    `--run -- "${executeCommand}"`;

  try {
    const { stderr } = await execAsync(isolateCommand, {
      timeout: (problemMeta.timeLimit + 1) * 1000
    });
    console.log(stderr);
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
    await cleanupBox(boxID);
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
    await cleanupBox(boxID);
    return { ...baseResult, status: SubmissionStatus.SE };
  }

  const { status: checkerResult, message: checkerMessage } = await runChecker(
    checkerPath,
    testcaseInput,
    userOutputFile,
    testcaseOutput,
    workDir
  );
  await cleanupBox(boxID);
  return { ...baseResult, status: checkerResult, message: checkerMessage };
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
    try {
      await execAsync('tps gen', { cwd: problemDir, timeout: 3600000 });
    } catch (genError) {
      console.error(`Failed to generate testcases in ${problemDir}:`, genError);
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

const writeUserSolution = (submission: ISubmission, dir: string) => {
  for (const file of submission.userSolution) {
    const filename = file.filename;
    const content = file.content;
    fs.writeFileSync(path.join(dir, filename), content);
  }
}

const compileUserSolution = async (submission: ISubmission, workDir: string): Promise<SubmissionStatus> => {
  const boxID = await getNextBoxID();
  const metaFile = path.join(workDir, 'compile.meta');
  const compileErrorFile = 'compile.error';
  const boxCompileCommand = languageSupport[submission.language as keyof typeof languageSupport].compileCommand;
  let boxDir: string;

  try {
    // Acquire file system lock for this box
    await acquireBoxLock(boxID);
    
    const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxID} --cg --wait --init`);
    boxDir = path.join(boxPath.trim(), 'box');
    
    // Critical section: ensure atomic file operations
    writeUserSolution(submission, boxDir);
  } catch (error) {
    console.error(`Failed to initialize or write files to box ${boxID}:`, error);
    await cleanupBox(boxID);
    return SubmissionStatus.SE;
  }

  const isolateCommand = `isolate --box-id=${boxID} ` +
    `--cg ` +
    `--wait ` +
    `--processes=20 ` +
    `--time=10 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stderr=${compileErrorFile} ` +
    `--full-env ` +
    `--run -- /bin/bash -c "${boxCompileCommand}"`;

  console.log('Running compilation command for box ID:', boxID);

  try {
    const { stdout } = await execAsync(isolateCommand, {
      timeout: 25000
    });
    console.log(stdout);
    const executablePath = path.join(boxDir, 'main');
    const targetPath = path.join(workDir, 'main.exe');
    if (fs.existsSync(executablePath)) {
      fs.copyFileSync(executablePath, targetPath);
      fs.chmodSync(targetPath, 0o755);
      console.log(`[${workDir}] Compilation successful, executable copied`);
    }
  } catch (error) {
    console.error(`[${workDir}] Compilation failed:`, error);
    await cleanupBox(boxID);
    return SubmissionStatus.CE;
  }
  await cleanupBox(boxID);
  return SubmissionStatus.QU;
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