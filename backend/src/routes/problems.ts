import { Router, Request, Response } from 'express';
import { query, validationResult, matchedData, checkSchema } from 'express-validator';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { updateProblemValidation } from '../validations/update-problem-validation';
import { IUser, User } from '../mongoose/schemas/users';
import { IRequest } from '../utils/request-interface';
import multer from 'multer';
import { readFileSync } from 'fs';
import * as tar from 'tar';
import { spawnSync } from 'child_process';
import { isTarGz } from '../utils/file-utils';

const problemsRouter = Router();

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

const getProblemById = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
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
      const testcase = metadata.testcase;
      const sampleTestcases = testcase.filter((test: any) =>
        test.subtask && test.subtask.includes('sample')
      );

      const description = readFileSync(`${problemDir}/description.md`, 'utf8');

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
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
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
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
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
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
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
    if (oldProblemDir.indexOf('..') === -1 && oldTarFilePath.indexOf('..') === -1) {
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
      response.status(200).send('Problem updated successfully');
    } catch (error) {
      console.error('Error processing metadata or updating database:', error);
      throw error; // Re-throw to be caught by the outer catch block for cleanup
    }
  } catch (error) {
    console.log(error);
    // Cleanup uploaded and extracted files on error
    if (newProblemDir.indexOf('..') === -1 && targetPath.indexOf('..') === -1) {
      spawnSync('rm', ['-rf', newProblemDir]);
      spawnSync('rm', ['-f', targetPath]);
    }
    response.status(400).send(`Error updating problem: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
  }
};

problemsRouter.get('/api/problems', getProblems);
problemsRouter.get('/api/problems/:problemID', getProblemById);

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

problemsRouter.delete('/api/problems/:problemID', deleteProblem);
problemsRouter.patch('/api/problems/:problemID', checkSchema(updateProblemValidation), updateProblem);

problemsRouter.put('/api/problems/:problemID', (request: IRequest, response: Response, next) => {
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
export { getProblems, getProblemById, createProblem, deleteProblem, updateProblem, updateProblemWithFile };