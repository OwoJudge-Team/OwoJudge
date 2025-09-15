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

interface JudgeResult {
  status: SubmissionStatus;
  time: number;
  memory: number;
  exitCode?: number;
  message?: string;
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

const writeUserSolution = (submission: ISubmission, dir: string) {
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
    return SubmissionStatus.CE;
  }
  return SubmissionStatus.QU;
}

const runAllTests = async (submission: ISubmission, workDir: string, isCompiledLanguage: boolean): Promise<SubmissionStatus> => {
  const boxId = getNextBoxId();
  const { stdout: boxPath } = await execAsync(`isolate --box-id=${boxId} --cg --init`);
  const boxDir = path.join(boxPath.trim(), 'box');

  if (isCompiledLanguage) {
    fs.copyFileSync(path.join(workDir, 'main.exe'), boxDir);
  } else {
    writeUserSolution(submission, boxDir);
  }

  const executeCommand = languageSupport[submission.language as keyof typeof languageSupport].executeCommand;
  const problemId = submission.problemID;
  const problemMeta = await Problem.findOne({ problemId });
  const problemDir = path.join('problems', problemId);

  // TODO: Find all testcases and run

  // TODO: Find all testcases and run
  return SubmissionStatus.AC;
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
          submission.save();
          return;
        }
        isCompiledLanguage = true;
      }
      const result = await runAllTests(submission, workDir, isCompiledLanguage);
      submission.status = result;
    } catch (error) {
      submission.status = SubmissionStatus.SE;
      submission.save();
    }
  } catch (error) {
    console.log(error);
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