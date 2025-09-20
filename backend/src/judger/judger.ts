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
  message?: string;
}

const submissionEmitter = new EventEmitter();
const submitEvent = 'submit';
let submissionQueue: Queue<ISubmission> = new Queue();
let nextBoxIndex: number = 0;

const getNextBoxID = (): number => {
  const result = nextBoxIndex;
  nextBoxIndex = (nextBoxIndex + 1) % 500;
  return result;
}

const cleanupBox = async (boxID: number) => {
  try {
    await execAsync(`isolate --box-ID=${boxID} --cg --cleanup`);
  } catch (error) {
    console.warn(`Failed to cleanup box ${boxID}:`, error);
  }
}

const compileChecker = async (problemDir: string, workDir: string): Promise<boolean> => {
  const checkerDir = path.join(problemDir, 'checker');
  const checkerExecutablePath = path.join(workDir, 'checker.exe');

  if (!fs.existsSync(checkerDir)) {
    console.error(`Checker directory not found for problem in ${problemDir}`);
    return false;
  }

  const boxID = getNextBoxID();
  const { stdout: boxPath } = await execAsync(`isolate --box-ID=${boxID} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  // Copy entire checker directory to the box
  try {
    await execAsync(`cp -r ${checkerDir}/* ${boxDir}`);
  } catch (error) {
    console.error(`Failed to copy checker directory to box ${boxID}:`, error);
    await cleanupBox(boxID);
    return false;
  }

  const metaFile = path.join(workDir, 'checker-compile.meta');
  const compileErrorFile = 'checker-compile.error';

  const isolateCommand = `isolate --box-ID=${boxID} ` +
    `--cg ` +
    `--time=10 ` +
    `--processes=20 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stderr=${compileErrorFile} ` +
    `--full-env ` +
    `--run -- /bin/bash -c "if [ ! -f checker.exe ]; then make; fi"`;

  console.log('Running checker compilation command for box ID:', boxID);

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

const writeUserSolution = (submission: ISubmission, dir: string) => {
  for (const file of submission.userSolution) {
    const filename = file.filename;
    const content = file.content;
    fs.writeFileSync(path.join(dir, filename), content);
  }
}

const compileUserSolution = async (submission: ISubmission, workDir: string): Promise<SubmissionStatus> => {
  const boxID = getNextBoxID();
  const metaFile = path.join(workDir, 'compile.meta');
  const compileErrorFile = 'compile.error';
  const boxCompileCommand = languageSupport[submission.language as keyof typeof languageSupport].compileCommand;

  const { stdout: boxPath } = await execAsync(`isolate --box-ID=${boxID} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');
  writeUserSolution(submission, boxDir);

  const isolateCommand = `isolate --box-ID=${boxID} ` +
    `--cg ` +
    `--processes=20 ` +
    `--time=10 ` +
    `--wall-time=20 ` +
    `--mem=512000 ` +
    `--meta=${metaFile} ` +
    `--stderr=${compileErrorFile} ` +
    `--full-env ` + // Allow full environment for compilation
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
}

const runUserSolution = async (
  submission: ISubmission,
  testcaseInput: string,
  testcaseOutput: string,
  workDir: string,
  isCompiledLanguage: boolean
): Promise<TestCaseResult> => {
  const boxID = getNextBoxID();
  const userOutputFile = path.join(workDir, 'user.out');
  const userErrorFile = path.join(workDir, 'user.error');
  const metaFile = path.join(workDir, 'run.meta');

  const { stdout: boxPath } = await execAsync(`isolate --box-ID=${boxID} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  if (isCompiledLanguage) {
    fs.copyFileSync(path.join(workDir, 'main.exe'), path.join(boxDir, 'main.exe'));
  } else {
    writeUserSolution(submission, boxDir);
  }

  fs.copyFileSync(testcaseInput, path.join(boxDir, path.basename(testcaseInput)));

  const problemID = submission.problemID;
  const problemMeta = await Problem.findOne({ problemID: problemID });
  if (!problemMeta) {
    throw new Error('Problem not found');
  }

  const executeCommand = languageSupport[submission.language as keyof typeof languageSupport].executeCommand;
  const isolateCommand = `isolate --box-ID=${boxID} ` +
    `--cg ` +
    `--processes=${problemMeta.processes + 1 + (isCompiledLanguage ? 0 : 2)} ` +
    `--time=${problemMeta.timeLimit} ` +
    `--wall-time=${problemMeta.timeLimit} ` +
    `--mem=${problemMeta.memoryLimit * 1024} ` +
    `--meta=${metaFile} ` +
    `--stdin=${path.basename(testcaseInput)} ` +
    `--stdout=${path.basename(userOutputFile)} ` +
    `--stderr=${path.basename(userErrorFile)} ` +
    // `--full-env ` + // Allow full environment for execution
    `--run -- "${executeCommand}"`;

  console.log('Running user solution command:', executeCommand);

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

const runChecker = async (
  checkerPath: string,
  inputFile: string,
  userOutputFile: string,
  answerFile: string,
  workDir: string
): Promise<{ status: SubmissionStatus; message: string }> => {
  const boxID = getNextBoxID();
  const { stdout: boxPath } = await execAsync(`isolate --box-ID=${boxID} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  fs.copyFileSync(checkerPath, path.join(boxDir, 'checker'));
  fs.chmodSync(path.join(boxDir, 'checker'), 0o755);
  fs.copyFileSync(inputFile, path.join(boxDir, 'input.in'));
  fs.copyFileSync(userOutputFile, path.join(boxDir, 'user.out'));
  fs.copyFileSync(answerFile, path.join(boxDir, 'answer.out'));

  const baseName = path.basename(inputFile).replace('.in', '');
  const metaFile = path.join(workDir, `checker-${baseName}.meta`);
  const checkerOutputFile = `checker-${baseName}.out`;
  const checkerErrorFile = `checker-${baseName}.err`;

  const isolateCommand = `isolate --box-ID=${boxID} ` +
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
    const message = fs.readFileSync(path.join(boxDir, path.basename(checkerErrorFile)), 'utf-8').trim();
    fs.copyFileSync(path.join(boxDir, path.basename(checkerOutputFile)), path.join(workDir, path.basename(checkerOutputFile)));
    fs.copyFileSync(path.join(boxDir, path.basename(checkerErrorFile)), path.join(workDir, path.basename(checkerErrorFile)));
    await cleanupBox(boxID);
    const scoreStr = fs.readFileSync(path.join(workDir, path.basename(checkerOutputFile)), 'utf-8').trim();
    const score = parseFloat(scoreStr);
    if (!isNaN(score) && score === 0) {
      return { status: SubmissionStatus.WA, message };
    }
    if (!isNaN(score) && score > 0 && score < 1) {
      return { status: SubmissionStatus.PS, message };
    }
    return { status: SubmissionStatus.AC, message };
  } catch (error: any) {
    return { status: SubmissionStatus.SE, message: 'Checker execution failed' };
  }
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

  // Although this may cause Race Condition, it's acceptable here
  // because we assume that the administrator won't delete the tests directory
  // while users are submitting solutions.
  // If the tests directory doesn't exist, we generate it using `tps gen`.
  // We set a timeout of 1 hour to prevent infinite loops.
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
        if (finalStatus === SubmissionStatus.AC) { // First non-AC result determines the final status
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
    // This can happen if there are no test cases or subtasks, or if all test cases passed but total score is 0.
    // If there were any non-AC results, finalStatus would have been updated.
    // If all were AC but score is 0, we need to decIDe what to show. Let's check if any test ran.
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
    const submissionID: string = hashString(submission.username + submission.createdTime);
    const workDir: string = '/tmp/judge/' + submissionID
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
      // Ignore, just means worker is IDle
    } else {
      console.error('Unexpected error in worker:', error);
    }
  }
}

const setupWorker = async (numWorkers: number) => {
  for (let i = 0; i < numWorkers; ++i) {
    submissionEmitter.on(submitEvent, worker);
  }
  while (true) {
    const submissions = await Submission.find({ status: SubmissionStatus.PD });
    for (const submission of submissions) {
      submissionQueue.enqueue(submission);
      submission.status = SubmissionStatus.QU;
      await submission.save();
      submissionEmitter.emit(submitEvent);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
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