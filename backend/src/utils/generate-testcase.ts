import * as path from 'path';
import * as fs from 'fs';
import { IsolateManager } from './isolate-manager';

export const generateSingleTestcase = async (problemID: string, testcaseName: string): Promise<string> => {
  // Sanitize inputs to prevent directory traversal and command injection
  // Whitelist: only allow alphanumeric, hyphens, and underscores
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validNameRegex.test(problemID) || !validNameRegex.test(testcaseName)) {
    throw new Error('Invalid characters in problemID or testcaseName. Only alphanumeric characters, hyphens, and underscores are allowed.');
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

  // Parse the 'data' file to find the target command
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

  // Run compilation and generation in isolated environment using IsolateManager
  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();
    const boxID = box.getBoxID();
    
    console.log(`Generating testcase ${testcaseName} for ${problemID} in isolated box ${boxID}`);

    // Copy gen directory to isolated box
    await box.copyToBox(`${genDir}/*`);

    // Compile the generator using make inside isolate
    const compileMetaFile = `/tmp/gen-compile-${boxID}.meta`;
    try {
      await box.run('make', {
        processes: 20,
        timeLimit: 10,
        wallTimeLimit: 60,
        memoryLimit: 512000,
        metaFile: compileMetaFile,
        stderr: 'compile.error',
        fullEnv: true,
        dirs: ['/usr/bin', '/bin', '/lib', '/etc'],
        cwd: '/box'
      }, 65000);
    } catch (error) {
      console.error(`Error compiling generator for ${problemID}:`, error);
      throw new Error('Failed to compile generator with make in isolated environment');
    }

    // Check if the executable exists, if not try with .exe extension (common in some Makefiles)
    let finalCommand = command;
    const cmdParts = command.split(' ');
    const exeName = cmdParts[0];

    try {
      await box.run('ls', {
        processes: 5,
        timeLimit: 2,
        wallTimeLimit: 5,
        memoryLimit: 10240,
        stdout: 'ls.out',
        cwd: '/box'
      });
      
      const lsOutput = fs.readFileSync(path.join(boxDir, 'ls.out'), 'utf-8');
      const files = lsOutput.split('\n').map(f => f.trim());
      
      if (!files.includes(exeName) && files.includes(`${exeName}.exe`)) {
        cmdParts[0] = `${exeName}.exe`;
        finalCommand = cmdParts.join(' ');
      }
    } catch (lsError) {
      console.warn('Failed to list files in box, proceeding with original command', lsError);
    }

    // Run the generator command inside isolate
    const genMetaFile = `/tmp/gen-run-${boxID}.meta`;
    try {
      await box.run(`./${finalCommand}`, {
        processes: 20,
        timeLimit: 10,
        wallTimeLimit: 60,
        memoryLimit: 512000,
        metaFile: genMetaFile,
        stdout: 'gen.output',
        stderr: 'gen.error',
        fullEnv: true,
        dirs: ['/usr/bin', '/bin', '/lib', '/etc'],
        cwd: '/box'
      }, 65000);

      // Read the generated output
      const outputPath = path.join(boxDir, 'gen.output');
      if (!fs.existsSync(outputPath)) {
        throw new Error('Generator did not produce output');
      }

      return fs.readFileSync(outputPath, 'utf8');
    } catch (error) {
      console.error(`Error generating testcase ${testcaseName} for ${problemID}:`, error);
      throw new Error(`Failed to generate testcase: ${testcaseName}`);
    }
  });
};
