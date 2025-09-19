import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import languageSupport from '../utils/language-support';
import { hashString } from '../utils/hash-password';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Queue } from 'queue-typescript';
import { EventEmitter } from 'events';
import { SubmissionStatus } from '../utils/submission-status';

const execAsync = promisify(exec);

interface TestCaseResult {
  testcase: string;
  status: SubmissionStatus;
  time: number;
  memory: number;
}

const submissionEmitter = new EventEmitter();
const submitEvent = 'submit';
let submissionQueue: Queue<ISubmission> = new Queue();
let nextBoxIndex: number = 0;

const getNextBoxId = (): number => {
  const result = nextBoxIndex;
  nextBoxIndex = (nextBoxIndex + 1) % 500;
  return result;
}

const cleanupBox = async (boxId: number) => {
  try {
    await execAsync(`isolate --box-id=${boxId} --cg --cleanup`);
  } catch (error) {
    console.warn(`Failed to cleanup box ${boxId}:`, error);
  }
}

const compileChecker = async (problemDir: string, workDir: string): Promise<boolean> => {
  const checkerDir = path.join(problemDir, 'checker');
  const checkerExecutablePath = path.join(workDir, 'checker.exe');

  if (!fs.existsSync(checkerDir)) {
    console.error(`Checker directory not found for problem in ${problemDir}`);
    return false;
  }

  const boxId = getNextBoxId();
  const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  // Copy entire checker directory to the box
  try {
    await execAsync(`cp -r ${checkerDir}/* ${boxDir}`);
  } catch (error) {
    console.error(`Failed to copy checker directory to box ${boxId}:`, error);
    await cleanupBox(boxId);
    return false;
  }

  const metaFile = path.join(workDir, 'checker-compile.meta');
  const compileErrorFile = path.join(workDir, 'checker-compile.error');

  const isolateCommand = `isolate --box-id=${boxId} ` +
    `--cg ` +
    `--time=10 ` +
    `--processes=20 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stderr=${compileErrorFile} ` +
    `--full-env ` +
    `--run -- /bin/bash -c "if [ ! -f checker.exe ]; then make; fi"`;

  console.log('Running checker compilation command:', isolateCommand);

  try {
    await execAsync(isolateCommand, { timeout: 25000 });
    const compiledCheckerPath = path.join(boxDir, 'checker.exe');
    if (fs.existsSync(compiledCheckerPath)) {
      fs.copyFileSync(compiledCheckerPath, checkerExecutablePath);
      fs.chmodSync(checkerExecutablePath, 0o755);
      console.log(`[${workDir}] Checker compilation successful`);
      await cleanupBox(boxId);
      return true;
    } else {
      console.error(`[${workDir}] Checker compilation failed, executable not found.`);
      await cleanupBox(boxId);
      return false;
    }
  } catch (error) {
    console.error(`[${workDir}] Checker compilation failed:`, error);
    await cleanupBox(boxId);
    return false;
  }
};

const writeUserSolution = (submission: ISubmission, dir: string) => {
  for (const file of submission.userSolution) {
    const filename = file.filename;
    const content = file.content;
    fs.writeFileSync(path.join(dir, filename), content);
  }
}

const compileUserSolution = async (submission: ISubmission, workDir: string): Promise<SubmissionStatus> => {
  const boxId = getNextBoxId();
  const metaFile = path.join(workDir, 'compile.meta');
  const compileErrorFile = 'compile.error';
  const boxCompileCommand = languageSupport[submission.language as keyof typeof languageSupport].compileCommand;

  const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');
  writeUserSolution(submission, boxDir);

  const isolateCommand = `isolate --box-id=${boxId} ` +
    `--cg ` +
    `--processes=20 ` +
    `--time=10 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stderr=${compileErrorFile} ` +
    `--full-env ` + // Allow full environment for compilation
    `--run -- /bin/bash -c "${boxCompileCommand}"`;

  console.log('Running compilation command:', isolateCommand);

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
    await cleanupBox(boxId);
    return SubmissionStatus.CE;
  }
  await cleanupBox(boxId);
  return SubmissionStatus.QU;
}

const runUserSolution = async (
  submission: ISubmission,
  testcaseInput: string,
  testcaseOutput: string,
  workDir: string,
  isCompiledLanguage: boolean
): Promise<TestCaseResult> => {
  const boxId = getNextBoxId();
  const userOutputFile = path.join(workDir, 'user.out');
  const userErrorFile = path.join(workDir, 'user.error');
  const metaFile = path.join(workDir, 'run.meta');

  const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  if (isCompiledLanguage) {
    fs.copyFileSync(path.join(workDir, 'main.exe'), path.join(boxDir, 'main'));
  } else {
    writeUserSolution(submission, boxDir);
  }

  const problemId = submission.problemID;
  const problemMeta = await Problem.findOne({ problemId });
  if (!problemMeta) {
    throw new Error('Problem not found');
  }

  const executeCommand = languageSupport[submission.language as keyof typeof languageSupport].executeCommand;
  const isolateCommand = `isolate --box-id=${boxId} ` +
    `--cg ` +
    `--processes=${problemMeta.processes + 1 + (isCompiledLanguage ? 0 : 2)} ` +
    `--time=${problemMeta.timeLimit} ` +
    `--wall-time=${problemMeta.timeLimit} ` +
    `--mem=${problemMeta.memoryLimit} ` +
    `--meta=${metaFile} ` +
    `--stdin=${testcaseInput} ` +
    `--stdout=${userOutputFile} ` +
    `--stderr=${userErrorFile} ` +
    // `--full-env ` + // Allow full environment for execution
    `--run -- /bin/bash -c "${executeCommand}"`;

  console.log('Running user solution command:', isolateCommand);

  try {
    const { stdout } = await execAsync(isolateCommand, {
      timeout: (problemMeta.timeLimit + 1) * 1000
    });
    console.log(stdout);
  } catch (error) {
    console.error(`[${workDir}] Execution failed:`, error);
  }

  // Compare user output with expected output
  const metaContent = fs.readFileSync(metaFile, 'utf-8');
  const meta: { [key: string]: string } = {};
  metaContent.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length === 2) {
      meta[parts[0]] = parts[1];
    }
  });

  const baseResult = {
    testcase: path.basename(testcaseInput, '.in'),
    time: parseFloat(meta['time'] || '0'),
    memory: parseInt(meta['memory'] || '0', 10)
  };

  if (meta.status) {
    await cleanupBox(boxId);
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

  const checkerPath = path.join(workDir, 'checker.exe');

  if (!fs.existsSync(checkerPath)) {
    console.error(`Checker not found for problem ${submission.problemID}`);
    await cleanupBox(boxId);
    return { ...baseResult, status: SubmissionStatus.SE };
  }

  const checkerResult = await runChecker(checkerPath, testcaseInput, userOutputFile, testcaseOutput, workDir);
  await cleanupBox(boxId);
  return { ...baseResult, status: checkerResult };
}

const runChecker = async (
  checkerPath: string,
  inputFile: string,
  userOutputFile: string,
  answerFile: string,
  workDir: string
): Promise<SubmissionStatus> => {
  const boxId = getNextBoxId();
  const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  fs.copyFileSync(checkerPath, path.join(boxDir, 'checker'));
  fs.chmodSync(path.join(boxDir, 'checker'), 0o755);
  fs.copyFileSync(inputFile, path.join(boxDir, 'input.in'));
  fs.copyFileSync(userOutputFile, path.join(boxDir, 'user.out'));
  fs.copyFileSync(answerFile, path.join(boxDir, 'answer.out'));

  const metaFile = path.join(workDir, `checker-${path.basename(inputFile)}.meta`);
  const checkerOutputFile = path.join(workDir, `checker-${path.basename(inputFile)}.out`);
  const checkerErrorFile = path.join(workDir, `checker-${path.basename(inputFile)}.err`);

  const isolateCommand = `isolate --box-id=${boxId} ` +
    `--cg ` +
    `--time=10 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stdout=${checkerOutputFile} ` +
    `--stderr=${checkerErrorFile} ` +
    `--run -- ./checker input.in user.out answer.out`;

  console.log('Running checker command:', isolateCommand);

  try {
    await execAsync(isolateCommand, { timeout: 25000 });
    await cleanupBox(boxId);
    return SubmissionStatus.AC;
  } catch (error: any) {
    await cleanupBox(boxId);
    switch (error.code) {
      case 1: // WA
        return SubmissionStatus.WA;
      case 2: // PE
        return SubmissionStatus.PE;
      case 3: // FAIL
        console.error(`Checker failed for ${inputFile}:`, error);
        return SubmissionStatus.SE;
      default: // Other errors
        console.error(`Checker execution failed with unexpected code ${error.code} for ${inputFile}:`, error);
        return SubmissionStatus.SE;
    }
  }
};

const runAllTests = async (submission: ISubmission, workDir: string, isCompiledLanguage: boolean): Promise<{ finalStatus: SubmissionStatus, score: number, testCaseResults: TestCaseResult[] }> => {
  const problemId = submission.problemID;
  const problemMeta = await Problem.findOne({ problemId });
  const problemDir = path.join('problems', problemId);

  const checkerCompiled = await compileChecker(problemDir, workDir);
  if (!checkerCompiled) {
    return { finalStatus: SubmissionStatus.SE, score: 0, testCaseResults: [] };
  }

  const subtasksPath = fs.readFileSync(path.join(problemDir, 'subtasks.json'), 'utf-8');
  const subtasks = JSON.parse(subtasksPath);

  const testcasesConfigPath = path.join(problemDir, 'tests', 'mapping');

  // Although this may cause Race Condition, it's acceptable here
  // because we assume that the administrator won't delete the tests directory
  // while users are submitting solutions.
  // If the tests directory doesn't exist, we generate it using `tps gen`.
  // We set a timeout of 1 hour to prevent infinite loops.
  try {
    fs.accessSync(testcasesConfigPath, fs.constants.R_OK);
  } catch (error) {
    try {
      await execAsync('tps gen', { cwd: problemDir, timeout: 3600 });
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
  for (const subtask of subtasks.subtasks) {
    const cases = subtaskTestCases.get(subtask.name);
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
      testCaseResults.push({ testcase, status: SubmissionStatus.SE, time: 0, memory: 0 });
      continue;
    }
    const result = await runUserSolution(submission, inputFile, outputFile, workDir, isCompiledLanguage);
    testCaseResults.push(result);
  }

  const resultsByTestCase = new Map(testCaseResults.map(r => [r.testcase, r]));
  let totalScore = 0;
  let finalStatus: SubmissionStatus = SubmissionStatus.AC;

  for (const subtask of subtasks.subtasks) {
    const cases = subtaskTestCases.get(subtask.name);
    if (!cases) continue;

    let subtaskOk = true;
    for (const testcaseName of cases) {
      const result = resultsByTestCase.get(testcaseName);
      if (!result || result.status !== SubmissionStatus.AC) {
        subtaskOk = false;
        if (finalStatus === SubmissionStatus.AC) { // First non-AC result determines the final status
          finalStatus = result?.status || SubmissionStatus.SE;
        }
        break;
      }
    }

    if (subtaskOk) {
      totalScore += subtask.score;
    }
  }

  if (totalScore === 0 && finalStatus === SubmissionStatus.AC) {
    // This can happen if there are no test cases or subtasks, or if all test cases passed but total score is 0.
    // If there were any non-AC results, finalStatus would have been updated.
    // If all were AC but score is 0, we need to decide what to show. Let's check if any test ran.
    if (testCaseResults.length > 0 && testCaseResults.every(r => r.status === SubmissionStatus.AC)) {
      finalStatus = SubmissionStatus.AC;
    } else if (testCaseResults.length > 0) {
      // find first non-AC
      finalStatus = testCaseResults.find(r => r.status !== SubmissionStatus.AC)?.status || SubmissionStatus.WA;
    } else {
      finalStatus = SubmissionStatus.SE;
    }
  } else if (totalScore > 0 && totalScore < (problemMeta?.fullScore || 100)) {
    finalStatus = SubmissionStatus.PS;
  }


  return { finalStatus, score: totalScore, testCaseResults };
}

/// working directory
/// workDir
/// ├── main.exe
/// ├── compile.meta
/// ├── compile.error
/// ├── user.out
/// ├── user.error
/// └── ...
const setupWorkingDirectory = async (workDir: string): Promise<void> => {
  if (fs.existsSync(workDir)) {
    return;
  }
  const userSolutionDir: string = path.join(workDir, 'src');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(userSolutionDir, { recursive: true });
}

const worker = async () => {
  try {
    const submission: ISubmission = submissionQueue.dequeue();
    const submissionId: string = hashString(submission.username + submission.createdTime);
    const workDir: string = '/tmp/judge/' + submissionId
    await setupWorkingDirectory(workDir);
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
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Queue is empty') {
      // Ignore, just means worker is idle
    } else {
      console.error('Unexpected error in worker:', error);
    }
  }
}

const setupWorker = async (numWorkers: number) => {
  for (let i = 0; i < numWorkers; ++i) {
    submissionEmitter.on(submitEvent, worker);
  }
}

const shutdownJudger = async () => {
  for (let submission of submissionQueue) {
    submission.status = SubmissionStatus.PD;
    await submission.save();
  }
}

const submitUserSubmission = async (submission: ISubmission) => {
  // Implementation for submitting user submission for judging
  submissionQueue.enqueue(submission);
  submission.status = SubmissionStatus.QU;
  submissionEmitter.emit(submitEvent);
};

export { setupWorker, submitUserSubmission, shutdownJudger };