import { Router, Request, Response } from 'express';
import { query, validationResult, matchedData, checkSchema } from 'express-validator';
import { Problem, IProblem, ProblemStatus } from '../mongoose/schemas/problems';
import { updateProblemValidation } from '../validations/update-problem-validation';
import { IUser, User } from '../mongoose/schemas/users';
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
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from '../utils/submission-status';
import { submitUserSubmission } from '../judger/judger';

const execAsync = promisify(exec);

// Simple mutex to prevent race conditions on problem directories
class ProblemLock {
  private static locks = new Map<string, Promise<void>>();

  static async acquire(id: string): Promise<() => void> {
    const previousLock = this.locks.get(id) || Promise.resolve();
    let release: () => void = () => {};
    const newLock = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Chain the new lock to the previous one
    // We want the next acquirer to wait for this newLock to resolve
    // Use .catch() to ensure the chain continues even if previousLock rejected
    const nextPromise = previousLock.catch(() => {}).then(() => newLock);
    
    // Update the map with the promise that resolves when WE are done
    this.locks.set(id, nextPromise);

    // Wait for our turn
    await previousLock.catch(() => {}); // Ignore errors from previous
    
    return () => {
      release();
      if (this.locks.get(id) === nextPromise) {
        this.locks.delete(id);
      }
    };
  }
}

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    next(null, `${uniqueSuffix}-${file.originalname}`);
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
      .select('id serialNumber title status createdTime timeLimit memoryLimit tags problemRelatedTags submissionDetail userDetail')
      .sort({ serialNumber: -1 });
    response.status(200).send(problems);
  } catch (error) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

const getProblemByID = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const problemDir = 'problems/' + serialNumber;

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
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
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
    // Check if problem with same fileName exists (unlikely with unique filenames, but good for sanity)
    const problem = await Problem.findOne({ fileName });
    if (problem) {
      response.status(403).send('Problem with this filename already exists');
      return;
    }

    console.log(targetPath);

    spawnSync('mv', [filePath as string, targetPath]);
    
    const stats = fs.statSync(targetPath);
    console.log(`File size at ${targetPath}: ${stats.size}`);
    
    // Create a directory for this specific upload to avoid conflicts
    const extractDir = 'problems/' + fileName.replace('.tar.gz', '');
    fs.mkdirSync(extractDir, { recursive: true });

    await tar.x({
      file: targetPath,
      cwd: extractDir,
      strip: 1 // Strip the top-level directory from the tarball
    });

    const problemDir = extractDir;
    // Cleanup macOS metadata files that might cause issues with cp
    spawnSync('find', [problemDir, '-name', '._*', '-delete']);

    const metadataPath = `${problemDir}/problem.json`;
    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      let newProblem: IProblem;
      try {
        newProblem = new Problem({
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
        // Cleanup extracted files on error
        fs.rmSync(problemDir, { recursive: true, force: true });
        response.status(403).send('Error creating problem');
        return;
      }

      // Move extracted directory to final location
      const finalProblemDir = 'problems/' + newProblem.serialNumber;
      
      // Acquire lock for this problem ID to prevent race conditions
      const releaseLock = await ProblemLock.acquire(newProblem.serialNumber.toString());
      
      try {
        if (fs.existsSync(finalProblemDir)) {
          fs.rmSync(finalProblemDir, { recursive: true, force: true });
        }
        fs.renameSync(problemDir, finalProblemDir);

        console.log(`Problem ${newProblem.serialNumber} saved to database`);
        
        // Generate test cases asynchronously using tps gen in isolated environment
        // This runs in the background and doesn't block the response
        // We keep the lock held during this process to prevent other requests from modifying the directory
        (async () => {
          try {
            console.log(`Starting async test generation for ${newProblem.serialNumber} in isolated environment`);
            
            await IsolateManager.withBox(async (box) => {
              const genBoxDir = box.getBoxDir();
              const workDir = path.join('judging', 'tps-gen-' + newProblem.serialNumber);
              
              // Ensure work directory exists
              fs.mkdirSync(workDir, { recursive: true });
              
              try {
                // Copy entire problem directory to isolated box
                await box.copyToBox(finalProblemDir);

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
                  dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])],
                  cwd: '/box'
                }, 4000000);

                // Copy generated tests directory back to problem directory
                const generatedTestsDir = path.join(genBoxDir, 'tests');
                const targetTestsDir = path.join(finalProblemDir, 'tests');

                if (fs.existsSync(generatedTestsDir)) {
                  // Remove old tests directory if exists and copy new one
                  if (fs.existsSync(targetTestsDir)) {
                    fs.rmSync(targetTestsDir, { recursive: true, force: true });
                  }
                  
                  // Ensure parent directory exists and is writable
                  if (fs.existsSync(finalProblemDir)) {
                    try {
                      fs.chmodSync(finalProblemDir, 0o755);
                    } catch (e) {
                      console.warn(`Failed to chmod ${finalProblemDir}:`, e);
                    }
                  } else {
                    // This should not happen as we are holding the lock, but just in case
                    fs.mkdirSync(finalProblemDir, { recursive: true });
                  }

                  await fs.promises.cp(generatedTestsDir, targetTestsDir, { recursive: true });
                  console.log(`Test cases generated and copied successfully for ${newProblem.serialNumber}`);

                  // Update problem status to Ready
                  await Problem.findByIdAndUpdate(newProblem._id, { status: ProblemStatus.Ready });
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
            console.error(`Failed to generate test cases for ${newProblem.serialNumber}:`, genError);
            await Problem.findByIdAndUpdate(newProblem._id, { status: ProblemStatus.Error });
          } finally {
            releaseLock();
          }
        })();
      } catch (error) {
        releaseLock();
        throw error;
      }
      
      response.status(201).json(newProblem);
      return;
    } catch (error) {
      console.error('Error reading or parsing metadata.json:', error);
      // Cleanup extracted files on error
      if (fs.existsSync(problemDir)) {
        fs.rmSync(problemDir, { recursive: true, force: true });
      }
      throw error;
    }
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
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }
  
  // Acquire lock to ensure no other operations (like async test generation) are running
  const releaseLock = await ProblemLock.acquire(serialNumber.toString());
  
  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const fileName = problem.serialNumber.toString();
    const problemDir = 'problems/' + fileName;
    const tarFilePath = 'problems/' + problem.fileName; // Use stored fileName for tarball

    try {
      if (problemDir.indexOf('..') !== -1 || tarFilePath.indexOf('..') !== -1) {
        throw new Error('Invalid file path');
      }
      spawnSync('rm', ['-rf', problemDir]);
      spawnSync('rm', ['-f', tarFilePath]);
    } catch (fsError) {
      console.error('Error deleting problem files:', fsError);
    }
    await Problem.findOneAndDelete({ serialNumber });
    response.status(201).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  } finally {
    releaseLock();
  }
};

const updateProblem = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user || !request.user.isAdmin) {
    response.status(401).send('Please login first');
    return;
  }
  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

  const data = matchedData(request);
  console.log(data);
  try {
    if (Object.keys(data).length === 2) {
      throw {
        message: 'No matched patch data',
        error: validationResult(request).array()
      };
    }
    let problem: IProblem | null = await Problem.findOneAndUpdate({ serialNumber }, data);
    if (!problem) {
      response.sendStatus(404);
      return;
    }
    problem = await Problem.findOne({ serialNumber }).select('serialNumber title createdTime');
    response.status(201).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const updateProblemWithFile = async (request: IRequest, response: Response): Promise<void> => {
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

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
    const existingProblem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!existingProblem) {
      spawnSync('rm', ['-f', filePath]);
      response.status(404).send('Problem not found');
      return;
    }

    spawnSync('mv', [filePath, targetPath]);
    
    // Create a directory for this specific upload to avoid conflicts
    const extractDir = 'problems/' + fileName.replace('.tar.gz', '');
    fs.mkdirSync(extractDir, { recursive: true });

    await tar.x({
      file: targetPath,
      cwd: extractDir,
      strip: 1
    });

    const newProblemDir = extractDir;

    // Cleanup macOS metadata files that might cause issues with cp
    spawnSync('find', [newProblemDir, '-name', '._*', '-delete']);

    const metadataPath = `${newProblemDir}/problem.json`;
    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      // Clean up old files
      const oldProblemDir = 'problems/' + existingProblem.serialNumber;
      const oldTarFilePath = 'problems/' + existingProblem.fileName;
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

      // Move new dir to final location
      const finalProblemDir = 'problems/' + serialNumber;
      
      // Acquire lock for this problem ID
      const releaseLock = await ProblemLock.acquire(serialNumber.toString());
      
      try {
        if (fs.existsSync(finalProblemDir)) {
          fs.rmSync(finalProblemDir, { recursive: true, force: true });
        }
        
        // Ensure parent directory exists (should be 'problems/')
        const parentDir = path.dirname(finalProblemDir);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.renameSync(newProblemDir, finalProblemDir);

        const updateData = {
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
          },
          status: ProblemStatus.Waiting
        };

        await Problem.findByIdAndUpdate(existingProblem._id, updateData, { new: true, runValidators: true });
        
        // Generate test cases asynchronously using tps gen in isolated environment
        // This runs in the background and doesn't block the response
        (async () => {
          try {
            console.log(`Starting async test generation for ${serialNumber} in isolated environment`);
            
            await IsolateManager.withBox(async (box) => {
              const genBoxDir = box.getBoxDir();
              const workDir = path.join('judging', 'tps-gen-' + serialNumber);
              
              // Ensure work directory exists
              fs.mkdirSync(workDir, { recursive: true });
              
              try {
                // Copy entire problem directory to isolated box
                await box.copyToBox(finalProblemDir);

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
                  dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])],
                  cwd: '/box'
                }, 4000000);

                // Copy generated tests directory back to problem directory
                const generatedTestsDir = path.join(genBoxDir, 'tests');
                const targetTestsDir = path.join(finalProblemDir, 'tests');

                if (fs.existsSync(generatedTestsDir)) {
                  // Remove old tests directory if exists and copy new one
                  if (fs.existsSync(targetTestsDir)) {
                    fs.rmSync(targetTestsDir, { recursive: true, force: true });
                  }

                  // Ensure parent directory exists and is writable
                  if (fs.existsSync(finalProblemDir)) {
                    try {
                      fs.chmodSync(finalProblemDir, 0o755);
                    } catch (e) {
                      console.warn(`Failed to chmod ${finalProblemDir}:`, e);
                    }
                  } else {
                    // This should not happen as we are holding the lock, but just in case
                    fs.mkdirSync(finalProblemDir, { recursive: true });
                  }

                  await fs.promises.cp(generatedTestsDir, targetTestsDir, { recursive: true });
                  console.log(`Test cases generated and copied successfully for ${serialNumber}`);

                  // Update problem status to Ready
                  await Problem.findByIdAndUpdate(existingProblem._id, { status: ProblemStatus.Ready });
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
            console.error(`Failed to generate test cases for ${serialNumber}:`, genError);
            await Problem.findByIdAndUpdate(existingProblem._id, { status: ProblemStatus.Error });
          } finally {
            releaseLock();
          }
        })();
      } catch (error) {
        releaseLock();
        throw error;
      }
      
      response.status(201).send('Problem updated successfully');
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
  if (!request.isAuthenticated() || !user) {
    response.status(401).send('Please login first');
    return;
  }

  const { testcaseName } = request.params;
  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

  const cacheKey = `${serialNumber}-${testcaseName}`;
  const userID = user.id.toString();
  const testcaseSetPath = path.join(generatedTestcasesPath, serialNumber.toString(), testcaseName);

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
      output = await generateSingleTestcase(serialNumber.toString(), testcaseName);
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
    console.error(`Error generating testcase for ${serialNumber} - ${testcaseName}:`, error);
    response.status(500).send(`Failed to generate testcase: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
  }
};

const getAllowedLanguages = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const problemDir = 'problems/' + serialNumber;
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

export const rejudgeProblem = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const user = request.user as IUser;
  if (!user.isAdmin) {
    response.status(403).send('You are not authorized to rejudge problems');
    return;
  }

  const serialNumber = parseInt(request.params.serialNumber);
  
  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const submissions: ISubmission[] = await Submission.find({ problemSerialNumber: serialNumber });

    // Process submissions in chunks to avoid overwhelming the database/judger
    for (const submission of submissions) {
      submission.status = SubmissionStatus.PD;
      submission.score = 0;
      submission.results = {};
      await submission.save();

      // We don't await the submission process here to avoid timeout
      // The judger queue handle it eventually
      submitUserSubmission(submission);
    }

    response.status(200).send(`Rejudge triggered for ${submissions.length} submissions.`);
  } catch (error) {
    console.log(error);
    response.status(500).send('Internal Server Error');
  }
};

problemsRouter.get('/api/problems', getProblems);
problemsRouter.get('/api/problems/:serialNumber', getProblemByID);
problemsRouter.get('/api/problems/:serialNumber/testcases/:testcaseName', generateTestcase);
problemsRouter.get('/api/problems/:serialNumber/allowed-languages', getAllowedLanguages);

problemsRouter.post('/api/problems', (request: IRequest, response: Response, next) => {
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

problemsRouter.delete('/api/problems/:serialNumber', deleteProblem);
problemsRouter.patch('/api/problems/:serialNumber', checkSchema(updateProblemValidation), updateProblem);
problemsRouter.post('/api/problems/:serialNumber/rejudge', rejudgeProblem);

problemsRouter.put('/api/problems/:serialNumber', (request: IRequest, response: Response, next) => {
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