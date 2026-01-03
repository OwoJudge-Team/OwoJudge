import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { updateProblemValidation } from '../validations/update-problem-validation';
import { IUser } from '../mongoose/schemas/users';
import { IRequest } from '../utils/request-interface';
import multer from 'multer';
import { readFileSync } from 'fs';
import * as tar from 'tar';
import { spawnSync, exec } from 'child_process';
import { promisify } from 'util';
import { isTarGz } from '../utils/file-utils';
import { generateSingleTestcase } from '../utils/generate-testcase';
import { IsolateManager } from '../utils/isolate-manager';
import * as fs from 'fs';
import * as path from 'path';
import { isAdmin, isAuthenticated } from '../middleware/auth';

const execAsync = promisify(exec);

const problemsRouter = Router();
const userRequestCounts = new Map<string, Map<string, number>>();
const generatedTestcasesPath = 'generated_testcases';

// Ensure the base directory for generated testcases exists
if (!fs.existsSync(generatedTestcasesPath)) {
  fs.mkdirSync(generatedTestcasesPath, { recursive: true });
}

// Set up multer directly in the problems router
const storage = multer.diskStorage({
  destination: (request: Request, file: Express.Multer.File, next: (error: Error | null, destination: string) => void) => {
    next(null, 'uploads/');
  },
  filename: (request: Request, file: Express.Multer.File, next: (error: Error | null, filename: string) => void) => {
    next(null, `${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (request, file, next: any) => {
    if (file.mimetype === 'application/gzip' || file.originalname.endsWith('.tar.gz')) {
      next(null, true);
    } else {
      next(new Error('Only .tar.gz files are allowed'), false);
    }
  }
}).single('problem');

const getProblems = async (request: IRequest, response: Response) => {
  try {
    const problems: IProblem[] = await Problem.find()
      .select('id problemID title createdTime timeLimit memoryLimit tags problemRelatedTags submissionDetail userDetail')
      .sort({ createdTime: -1 });
    response.status(200).send(problems);
  } catch (error) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

const getProblemByID = async (request: IRequest, response: Response) => {
  const { problemID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ problemID });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const problemDir = 'problems/' + problemID;

    try {
      // Read sample testcases from tests/mapping file
      const sampleTestcases: any[] = [];
      const testsDir = path.join(problemDir, 'tests');
      const mappingPath = path.join(testsDir, 'mapping');

      if (fs.existsSync(mappingPath)) {
        const mappingContent = fs.readFileSync(mappingPath, 'utf-8');
        const sampleTestcaseNames: string[] = [];

        // Parse mapping file to find sample subtask testcases
        for (const line of mappingContent.split('\n')) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const parts = trimmedLine.split(/\s+/);
          if (parts.length < 2) continue;

          const subtaskName = parts[0];
          const testcaseName = parts[1];

          // Check if this belongs to sample subtask
          if (subtaskName === 'sample' || subtaskName.includes('sample')) {
            sampleTestcaseNames.push(testcaseName);
          }
        }

        // Read actual test case files
        for (const testcaseName of sampleTestcaseNames) {
          const inputPath = path.join(testsDir, `${testcaseName}.in`);
          const outputPath = path.join(testsDir, `${testcaseName}.out`);

          if (fs.existsSync(inputPath) && fs.existsSync(outputPath)) {
            sampleTestcases.push({
              name: testcaseName,
              input: fs.readFileSync(inputPath, 'utf-8'),
              output: fs.readFileSync(outputPath, 'utf-8')
            });
          }
        }
      }

      const description = readFileSync(`${problemDir}/statement/description.md`, 'utf8');

      const fullProblem = {
        ...problem.toObject(),
        description: description,
        sampleTestcases: sampleTestcases || []
      };

      response.status(200).send(fullProblem);
    } catch (metadataErr) {
      console.error('Error reading metadata:', metadataErr);
      response.status(200).send(problem);
    }
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

/// The problem structure is as follows
/// problems
/// ├── problem1
/// │   ├── metadata.json
/// │   ├── testcases
/// │   │   ├── test1.in
/// │   │   ├── test1.out
/// │   │   └── ...
/// │   ├── description.md
/// │   └── ...
/// └── ...
const createProblem = async (request: IRequest, response: Response): Promise<void> => {
  const filePath = request.file?.path;
  if (!filePath) {
    response.status(400).send('No file uploaded');
    return;
  }

  console.log(filePath);
  const file = readFileSync(filePath as string);
  if (!isTarGz(file)) {
    response.status(400).send('Invalid file format. Expected tar.gz file.');
    return;
  }

  const fileName = (filePath as string).split('/').reverse()[0];
  const targetPath = 'problems/' + fileName;
  try {
    const problem = await Problem.findOne({ fileName });
    if (problem) {
      response.status(403).send('Problem with this filename already exists');
      return;
    }

    console.log(targetPath);

    spawnSync('mv', [filePath as string, targetPath]);
    await tar.x({
      file: targetPath,
      cwd: 'problems/'
    });

    const problemDir = 'problems/' + fileName.replace('.tar.gz', '');
    const metadataPath = `${problemDir}/problem.json`;
    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      if (metadata.code.includes('.') || metadata.code.includes('/')) {
        throw new Error('Problem ID cannot contain `.` or `/`');
      }

      try {
        const newProblem = new Problem({
          problemID: metadata.code,
          createdTime: metadata.createdTime || new Date(),
          title: metadata.title,
          fileName: fileName,
          timeLimit: metadata.time_limit,
          memoryLimit: metadata.memory_limit,
          scorePolicy: metadata.score_policy,
          fullScore: metadata.full_score,
          tags: metadata.tags || [],
          testcase: metadata.testcase,
          problemRelatedTags: metadata.problemRelatedTags || [],
          submissionDetail: {
            accepted: metadata.submissionDetail?.accepted || 0,
            submitted: metadata.submissionDetail?.submitted || 0,
            timeLimitExceeded: metadata.submissionDetail?.timeLimitExceeded || 0,
            memoryLimitExceeded: metadata.submissionDetail?.memoryLimitExceeded || 0,
            wrongAnswer: metadata.submissionDetail?.wrongAnswer || 0,
            runtimeError: metadata.submissionDetail?.runtimeError || 0,
            compilationError: metadata.submissionDetail?.compilationError || 0,
            processLimitExceeded: metadata.submissionDetail?.processLimitExceeded || 0
          },
          userDetail: {
            solved: metadata.userDetail?.solved || 0,
            attempted: metadata.userDetail?.attempted || 0
          }
        });
        await newProblem.save();
      } catch (dupError) {
        console.error('Error creating problem:', dupError);
        response.status(403).send('Error creating problem');
        return;
      }
      console.log(`Problem ${metadata.code} saved to database`);

      // Generate test cases asynchronously using tps gen in isolated environment
      // This runs in the background and doesn't block the response
      (async () => {
        try {
          console.log(`Starting async test generation for ${metadata.code} in isolated environment`);

          await IsolateManager.withBox(async (box) => {
            const genBoxDir = box.getBoxDir();
            const workDir = path.join('judging', 'tps-gen-' + metadata.code);

            // Ensure work directory exists
            fs.mkdirSync(workDir, { recursive: true });

            try {
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
                console.log(`Test cases generated and copied successfully for ${metadata.code}`);
              } else {
                throw new Error('Tests directory not generated by tps gen');
              }
            } finally {
              // Clean up work directory
              if (fs.existsSync(workDir)) {
                fs.rmSync(workDir, { recursive: true, force: true });
              }
            }
          });
        } catch (genError) {
          console.error(`Failed to generate test cases for ${metadata.code}:`, genError);
        }
      })();

    } catch (error) {
      console.error('Error reading or parsing metadata.json:', error);
      throw error;
    }

    response.status(200).send('File uploaded and extracted successfully');
    return;
  } catch (error) {
    console.log(error);
    const problemDir = 'problems/' + fileName.replace('.tar.gz', '');
    const tarFilePath = 'problems/' + fileName;
    try {
      if (problemDir.indexOf('..') !== -1 || tarFilePath.indexOf('..') !== -1) {
        throw new Error('Invalid file path');
      }
      spawnSync('rm', ['-rf', problemDir]);
      spawnSync('rm', ['-f', tarFilePath]);
    } catch (fsError) {
      console.error('Error deleting problem files:', fsError);
    }
    response.status(400).send('Error extracting file');
    return;
  }
};

const deleteProblem = async (request: IRequest, response: Response) => {
  const { problemID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ problemID });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const fileName = problem.problemID;
    const problemDir = 'problems/' + fileName;
    const tarFilePath = 'problems/' + fileName + '.tar.gz';

    try {
      if (problemDir.indexOf('..') !== -1 || tarFilePath.indexOf('..') !== -1) {
        throw new Error('Invalid file path');
      }
      spawnSync('rm', ['-rf', problemDir]);
      spawnSync('rm', ['-f', tarFilePath]);
    } catch (fsError) {
      console.error('Error deleting problem files:', fsError);
    }
    await Problem.findOneAndDelete({ problemID });
    response.status(200).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const updateProblem = async (request: IRequest, response: Response) => {
  const { problemID } = request.params;
  const data = matchedData(request);
  console.log(data);
  try {
    if (Object.keys(data).length === 2) {
      throw {
        message: 'No matched patch data',
        error: validationResult(request).array()
      };
    }
    let problem: IProblem | null = await Problem.findOneAndUpdate({ problemID }, data);
    if (!problem) {
      response.sendStatus(404);
      return;
    }
    problem = await Problem.findOne({ problemID }).select('problemID title createdTime');
    response.status(201).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const updateProblemWithFile = async (request: IRequest, response: Response): Promise<void> => {
  const { problemID } = request.params;
  const filePath = request.file?.path;
  if (!filePath) {
    response.status(400).send('No file uploaded');
    return;
  }

  const file = readFileSync(filePath);
  if (!isTarGz(file)) {
    response.status(400).send('Invalid file format. Expected tar.gz file.');
    return;
  }

  const fileName = (filePath as string).split('/').reverse()[0];
  const newProblemDirName = fileName.replace('.tar.gz', '');
  const targetPath = 'problems/' + fileName;
  const newProblemDir = 'problems/' + newProblemDirName;

  try {
    const existingProblem: IProblem | null = await Problem.findOne({ problemID });
    if (!existingProblem) {
      spawnSync('rm', ['-f', filePath]);
      response.status(404).send('Problem not found');
      return;
    }

    // Clean up old files
    const oldProblemDir = 'problems/' + existingProblem.problemID;
    const oldTarFilePath = 'problems/' + existingProblem.problemID + '.tar.gz';
    const problemsBaseDir = path.resolve('problems');
    const resolvedOldProblemDir = path.resolve(oldProblemDir);
    const resolvedOldTarFilePath = path.resolve(oldTarFilePath);
    if (
      resolvedOldProblemDir.startsWith(problemsBaseDir + path.sep) &&
      resolvedOldTarFilePath.startsWith(problemsBaseDir + path.sep)
    ) {
      spawnSync('rm', ['-rf', oldProblemDir]);
      spawnSync('rm', ['-f', oldTarFilePath]);
    }

    spawnSync('mv', [filePath, targetPath]);
    await tar.x({
      file: targetPath,
      cwd: 'problems/'
    });

    const metadataPath = `${newProblemDir}/problem.json`;
    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      if (metadata.code !== problemID) {
        throw new Error(`Problem code in metadata (${metadata.code}) does not match URL parameter (${problemID}).`);
      }

      const updateData = {
        problemID: metadata.code,
        createdTime: metadata.createdTime || new Date(),
        title: metadata.title,
        fileName: fileName,
        timeLimit: metadata.time_limit,
        memoryLimit: metadata.memory_limit,
        scorePolicy: metadata.score_policy,
        fullScore: metadata.full_score,
        tags: metadata.tags || [],
        testcase: metadata.testcase,
        problemRelatedTags: metadata.problemRelatedTags || [],
        submissionDetail: {
          ...existingProblem.submissionDetail,
          ...(metadata.submissionDetail || {})
        },
        userDetail: {
          ...existingProblem.userDetail,
          ...(metadata.userDetail || {})
        }
      };

      await Problem.findOneAndUpdate({ problemID }, updateData, { new: true, runValidators: true });
      console.log(`Problem ${problemID} updated successfully`);

      // Generate test cases asynchronously using tps gen in isolated environment
      // This runs in the background and doesn't block the response
      (async () => {
        try {
          console.log(`Starting async test generation for ${problemID} in isolated environment`);

          await IsolateManager.withBox(async (box) => {
            const genBoxDir = box.getBoxDir();
            const workDir = path.join('judging', 'tps-gen-' + problemID);

            // Ensure work directory exists
            fs.mkdirSync(workDir, { recursive: true });

            try {
              // Copy entire problem directory to isolated box
              await box.copyToBox(`${newProblemDir}/*`);

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
              const targetTestsDir = path.join(newProblemDir, 'tests');

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
            } finally {
              // Clean up work directory
              if (fs.existsSync(workDir)) {
                fs.rmSync(workDir, { recursive: true, force: true });
              }
            }
          });
        } catch (genError) {
          console.error(`Failed to generate test cases for ${problemID}:`, genError);
        }
      })();

      response.status(200).send('Problem updated successfully');
    } catch (error) {
      console.error('Error processing metadata or updating database:', error);
      throw error; // Re-throw to be caught by the outer catch block for cleanup
    }
  } catch (error) {
    console.log(error);
    // Cleanup uploaded and extracted files on error
    // Prevent directory traversal by ensuring paths are within the 'problems' directory
    const problemsBaseDir = path.resolve('problems');
    const absNewProblemDir = path.resolve(newProblemDir);
    const absTargetPath = path.resolve(targetPath);
    if (
      absNewProblemDir.startsWith(problemsBaseDir + path.sep) &&
      absTargetPath.startsWith(problemsBaseDir + path.sep)
    ) {
      spawnSync('rm', ['-rf', newProblemDir]);
      spawnSync('rm', ['-f', targetPath]);
    }
    response.status(400).send(`Error updating problem: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
  }
};

const generateTestcase = async (request: IRequest, response: Response) => {
  const user = request.user as IUser;
  const { problemID, testcaseName } = request.params;
  const cacheKey = `${problemID}-${testcaseName}`;
  const userID = user.id.toString();
  const testcaseSetPath = path.join(generatedTestcasesPath, problemID, testcaseName);

  try {
    // Ensure directories exist
    fs.mkdirSync(testcaseSetPath, { recursive: true });
    if (!userRequestCounts.has(userID)) {
      userRequestCounts.set(userID, new Map());
    }

    const userCounts = userRequestCounts.get(userID)!;
    const currentRequestCount = userCounts.get(cacheKey) || 0;

    const existingTestcasesCount = fs.readdirSync(testcaseSetPath).length;

    // Determine if a new testcase needs to be generated
    let shouldGenerateNew = true;
    if (existingTestcasesCount > 0) {
      const maxRequestsByAnyUser = Math.max(
        0,
        ...Array.from(userRequestCounts.values()).map((counts) => counts.get(cacheKey) || 0)
      );
      if (currentRequestCount < maxRequestsByAnyUser) {
        shouldGenerateNew = false;
      }
    }

    let output: string;
    if (shouldGenerateNew) {
      // Generate a new testcase and save it to disk
      output = await generateSingleTestcase(problemID, testcaseName);
      const newTestcasePath = path.join(testcaseSetPath, `${existingTestcasesCount}.in`);
      fs.writeFileSync(newTestcasePath, output);
    } else {
      // Get the testcase corresponding to the user's request count from disk
      const testcaseToReadPath = path.join(testcaseSetPath, `${currentRequestCount}.in`);
      output = fs.readFileSync(testcaseToReadPath, 'utf-8');
    }

    // Increment the user's request count for this specific testcase
    userCounts.set(cacheKey, currentRequestCount + 1);

    response.setHeader('Content-Type', 'text/plain');
    response.status(200).send(output);
  } catch (error) {
    console.error(`Error generating testcase for ${problemID} - ${testcaseName}:`, error);
    response.status(500).send(`Failed to generate testcase: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
  }
};

const getAllowedLanguages = async (request: IRequest, response: Response) => {
  const { problemID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ problemID });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const problemDir = 'problems/' + problemID;
    const metadataPath = `${problemDir}/problem.json`;

    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      const allowedLanguages = metadata.allowed_languages || [];

      response.status(200).send(allowedLanguages);
    } catch (metadataErr) {
      console.error('Error reading metadata:', metadataErr);
      response.status(200).send([]);
    }
  } catch (error) {
    console.log(error);
    response.status(500).send('Internal Server Error');
  }
};

problemsRouter.get('/api/problems', getProblems);
problemsRouter.get('/api/problems/:problemID', isAuthenticated, getProblemByID);
problemsRouter.get('/api/problems/:problemID/testcases/:testcaseName', isAuthenticated, generateTestcase);
problemsRouter.get('/api/problems/:problemID/allowed-languages', isAuthenticated, getAllowedLanguages);

problemsRouter.post('/api/problems', isAdmin, (request: IRequest, response: Response, next) => {
  upload(request, response, (err) => {
    if (err instanceof multer.MulterError) {
      response.status(400).send(`Multer error: ${err.message}`);
      return;
    } else if (err) {
      response.status(400).send(`Error: ${err.message}`);
      return;
    }
    next();
  });
}, createProblem);

problemsRouter.delete('/api/problems/:problemID', isAdmin, deleteProblem);
problemsRouter.patch('/api/problems/:problemID', isAuthenticated, checkSchema(updateProblemValidation), updateProblem);

problemsRouter.put('/api/problems/:problemID', isAdmin, (request: IRequest, response: Response, next) => {
  upload(request, response, (err) => {
    if (err instanceof multer.MulterError) {
      response.status(400).send(`Multer error: ${err.message}`);
      return;
    } else if (err) {
      response.status(400).send(`Error: ${err.message}`);
      return;
    }
    next();
  });
}, updateProblemWithFile);

export default problemsRouter;
export {
  getProblems,
  getProblemByID,
  createProblem,
  deleteProblem,
  updateProblem,
  updateProblemWithFile,
  generateTestcase
};