import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import languageSupport from '../utils/language-support';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface JudgeResult {
  status: string;
  time: number;
  memory: number;
  exitCode?: number;
  message?: string;
}

const submitUserSubmission = async (submission: ISubmission) => {
  // Implementation for submitting user submission for judging
};

export default submitUserSubmission;