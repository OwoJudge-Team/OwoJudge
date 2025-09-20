import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export const generateSingleTestcase = async (problemID: string, testcaseName: string): Promise<string> => {
  // Sanitize inputs to prevent directory traversal and command injection
  if (problemID.includes('..') || testcaseName.match(/[\s;&|`$()<>]/)) {
    throw new Error('Invalid characters in problemID or testcaseName');
  }

  const problemDir = path.resolve('problems', problemID);

  // Check if problem directory exists
  if (!fs.existsSync(problemDir)) {
    throw new Error(`Problem directory not found: ${problemDir}`);
  }

  const genDir = path.join(problemDir, 'gen');
  const dataFilePath = path.join(genDir, 'data');

  // Check if required files/directories exist
  if (!fs.existsSync(genDir) || !fs.existsSync(dataFilePath)) {
    throw new Error('Required files/directories (gen directory, gen/data) not found in problem directory.');
  }

  // Compile the generator using make
  try {
    await execAsync('make', { cwd: genDir, timeout: 60000 });
  } catch (error) {
    console.error(`Error compiling generator for ${problemID}:`, error);
    throw new Error('Failed to compile generator with make');
  }

  // Generate the testcase by parsing the 'data' file
  try {
    const dataFileContent = fs.readFileSync(dataFilePath, 'utf8');
    const lines = dataFileContent.split('\n');

    const testcaseParts = testcaseName.split('-');
    if (testcaseParts.length < 2) {
      throw new Error(`Invalid testcaseName format: ${testcaseName}. Expected format: 'subtask-index'`);
    }
    const subtaskName = testcaseParts[0];
    const testcaseIndex = parseInt(testcaseParts[1], 10) - 1;

    if (isNaN(testcaseIndex) || testcaseIndex < 0) {
      throw new Error(`Invalid testcase index: ${testcaseParts[1]}`);
    }

    let inTargetSubtask = false;
    let genCommands: string[] = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('@subtask')) {
        inTargetSubtask = trimmedLine.split(/\s+/)[1] === subtaskName;
        continue;
      }
      if (inTargetSubtask && trimmedLine.startsWith('gen ')) {
        genCommands.push(trimmedLine);
      }
    }

    if (testcaseIndex >= genCommands.length) {
      throw new Error(`Testcase index ${testcaseIndex + 1} out of bounds for subtask ${subtaskName}`);
    }

    const command = genCommands[testcaseIndex];
    const { stdout } = await execAsync(`./${command}`, { cwd: genDir, timeout: 60000 });
    return stdout;
  } catch (error) {
    console.error(`Error generating testcase ${testcaseName} for ${problemID}:`, error);
    throw new Error(`Failed to generate testcase: ${testcaseName}`);
  }
};
