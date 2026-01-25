import * as path from 'path';
import * as fs from 'fs';
import { IsolateManager } from './isolate-manager';
import languageSupport from './language-support';

export interface GeneratedTestcaseResult {
  input: string;
  output: string;
  actualTestName: string;
  subtaskName: string;
}

const EXTENSION_LANGUAGE_MAP: Record<string, keyof typeof languageSupport> = {
  '.c': 'gcc c17',
  '.cpp': 'g++ c++17',
  '.cc': 'g++ c++17',
  '.cxx': 'g++ c++17',
  '.rs': 'rust',
  '.py': 'python3',
  '.js': 'nodejs',
  '.sh': 'bash',
};

const resolveSolutionFile = (problemDir: string): string => {
  const solutionDir = path.join(problemDir, 'solution');
  const solutionsJsonPath = path.join(problemDir, 'solutions.json');

  if (fs.existsSync(solutionsJsonPath)) {
    try {
      const content = fs.readFileSync(solutionsJsonPath, 'utf8');
      const parsed = JSON.parse(content) as Record<string, { verdict?: string }>;
      const preferred = Object.entries(parsed).find(([, meta]) => meta.verdict === 'model_solution')
        || Object.entries(parsed).find(([, meta]) => meta.verdict === 'correct')
        || Object.entries(parsed)[0];

      if (preferred) {
        const filename = preferred[0];
        const candidate = path.join(solutionDir, filename);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    } catch (error) {
      console.warn('Failed to parse solutions.json, falling back to solution directory:', error);
    }
  }

  if (fs.existsSync(solutionDir)) {
    const files = fs.readdirSync(solutionDir);
    if (files.length > 0) {
      return path.join(solutionDir, files[0]);
    }
  }

  throw new Error('No reference solution found in solution directory.');
};

const computeOutputWithSolution = async (problemDir: string, input: string): Promise<string> => {
  const solutionFilePath = resolveSolutionFile(problemDir);
  const extension = path.extname(solutionFilePath).toLowerCase();
  const language = EXTENSION_LANGUAGE_MAP[extension];

  if (!language) {
    throw new Error(`Unsupported solution file type: ${extension}`);
  }

  const languageConfig = languageSupport[language];
  if (!languageConfig) {
    throw new Error(`Unsupported language configuration for ${language}`);
  }

  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();
    const boxID = box.getBoxID();

    const mainFileName = `main${extension}`;
    fs.copyFileSync(solutionFilePath, path.join(boxDir, mainFileName));

    const inputFile = path.join(boxDir, 'input.in');
    fs.writeFileSync(inputFile, input);

    const compileMetaFile = `/tmp/sol-compile-${boxID}.meta`;
    if (languageConfig.compileCommand) {
      await box.run(languageConfig.compileCommand, {
        processes: 20,
        timeLimit: 20,
        wallTimeLimit: 60,
        memoryLimit: 512000,
        metaFile: compileMetaFile,
        stderr: 'solution-compile.error',
        fullEnv: true,
        dirs: ['/usr', '/usr/bin', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])],
        cwd: '/box',
      }, 65000);
    }

    let runCommand = languageConfig.executeCommand;
    if (languageConfig.compileCommand) {
      const compiledExe = path.join(boxDir, 'main.exe');
      const compiledBin = path.join(boxDir, 'main');
      if (fs.existsSync(compiledExe)) {
        runCommand = './main.exe';
      } else if (fs.existsSync(compiledBin)) {
        runCommand = './main';
      }
    }

    const runMetaFile = `/tmp/sol-run-${boxID}.meta`;
    await box.run(runCommand, {
      processes: 20,
      timeLimit: 10,
      wallTimeLimit: 60,
      memoryLimit: 512000,
      metaFile: runMetaFile,
      stdin: 'input.in',
      stdout: 'solution.out',
      stderr: 'solution.error',
      fullEnv: true,
      dirs: ['/usr', '/usr/bin', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])],
      cwd: '/box',
    }, 65000);

    const outputPath = path.join(boxDir, 'solution.out');
    if (!fs.existsSync(outputPath)) {
      throw new Error('Solution did not produce output');
    }

    return fs.readFileSync(outputPath, 'utf8');
  });
};

export const generateSingleTestcase = async (problemSerialNumber: string, testcaseName: string): Promise<GeneratedTestcaseResult> => {
  // Sanitize inputs to prevent directory traversal and command injection
  // Whitelist: only allow alphanumeric, hyphens, and underscores
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validNameRegex.test(problemSerialNumber) || !validNameRegex.test(testcaseName)) {
    throw new Error('Invalid characters in problemSerialNumber or testcaseName. Only alphanumeric characters, hyphens, and underscores are allowed.');
  }

  const problemDir = path.resolve('problems', problemSerialNumber);

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
  let genCommandLineNumbers: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('@subtask')) {
      inTargetSubtask = trimmedLine.split(/\s+/)[1] === subtaskName;
      continue;
    }
    if (inTargetSubtask && trimmedLine.startsWith('gen ')) {
      genCommands.push(trimmedLine);
      genCommandLineNumbers.push(i + 1);
    }
  }

  if (testcaseIndex >= genCommands.length) {
    throw new Error(`Testcase index ${testcaseIndex + 1} out of bounds for subtask ${subtaskName}`);
  }

  const command = genCommands[testcaseIndex];
  const commandLineNumber = genCommandLineNumbers[testcaseIndex];

  if (command.startsWith('manual ')) {
    throw new Error(`Testcase ${testcaseName} is manual and cannot be generated`);
  }

  const randomArg = `--rand=${Math.floor(Math.random() * 1e9)}`;

  // Run compilation and generation in isolated environment using IsolateManager
  return await IsolateManager.withBox(async (box) => {
    const boxDir = box.getBoxDir();
    const boxID = box.getBoxID();
    
    console.log(`Generating testcase ${testcaseName} for ${problemSerialNumber} in isolated box ${boxID}`);

    // Copy gen directory to isolated box
    await box.copyToBox(`${genDir}/*`);

    // Compile the generator using make inside isolate
    const compileMetaFile = `/tmp/gen-compile-${boxID}.meta`;
    try {
      await box.run('make', {
        processes: 20,
        timeLimit: 60,
        wallTimeLimit: 120,
        memoryLimit: 512000,
        metaFile: compileMetaFile,
        stderr: 'compile.error',
        fullEnv: true,
        dirs: ['/usr/bin', '/bin', '/lib', '/etc'],
        cwd: '/box'
      }, 65000);
    } catch (error) {
      console.error(`Error compiling generator for ${problemSerialNumber}:`, error);
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

    finalCommand = `${finalCommand} ${randomArg}`;

    console.log(finalCommand);
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

      const input = fs.readFileSync(outputPath, 'utf8');

      // Read gen_summary to find the actual test name for this generation
      let actualTestName = testcaseName;
      const genSummaryCandidates = [
        path.join(problemDir, 'tests', 'gen_summary'),
        path.join(problemDir, 'gen', 'gen_summary'),
      ];
      for (const genSummaryPath of genSummaryCandidates) {
        if (!fs.existsSync(genSummaryPath)) {
          continue;
        }
        try {
          const genSummaryContent = fs.readFileSync(genSummaryPath, 'utf8');
          const summaryLines = genSummaryContent
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'));

          for (const line of summaryLines) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
              const genTestName = parts[0];
              const genLineNumber = parseInt(parts[1], 10);
              if (!isNaN(genLineNumber) && genLineNumber === commandLineNumber) {
                actualTestName = genTestName;
                break;
              }
            }
          }
        } catch (summaryError) {
          console.warn('Could not read gen_summary, using default test name:', summaryError);
        }
      }

      const output = await computeOutputWithSolution(problemDir, input);
      return { input, output, actualTestName, subtaskName };
    } catch (error) {
      console.error(`Error generating testcase ${testcaseName} for ${problemSerialNumber}:`, error);
      throw new Error(`Failed to generate testcase: ${testcaseName}`);
    }
  });
};
