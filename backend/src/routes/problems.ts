import { Router, Request, Response } from 'express';
import { query, validationResult, matchedData, checkSchema } from 'express-validator';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { createProblemValidation } from '../validations/create-problem-validation';
import { updateProblemValidation } from '../validations/update-problem-validation';
import { IUser, User } from '../mongoose/schemas/users';
import { IRequest } from '../utils/request-interface';
import multer from 'multer';
import { readFileSync } from 'fs';
import * as tar from 'tar';
import { spawn, spawnSync } from 'child_process';

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
      .select('id displayID title createdTime')
      .sort({ createdTime: -1 });
    response.status(200).send(problems);
  } catch (error) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

const getProblemById = async (request: IRequest, response: Response) => {
  if (!request.user) {
    response.status(401).send('Please login first');
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ displayID });
    if (!problem) {
      response.sendStatus(404);
    }
    response.status(200).send(problem);
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
/// │   └── ...
/// ├── problem2
/// │   ├── metadata.json
/// │   ├── testcases
/// │   │   ├── test1.in
/// │   │   ├── test1.out
/// │   │   └── ...
/// │   └── ...
/// └── ...
const createProblem = async (request: IRequest, response: Response): Promise<void> => {
  // const user = request.user as IUser;
  // if (!request.user || !user.isAdmin) {
  //   response.status(401).send('Please login as an admin first');
  //   return;
  // }
  const filePath = request.file?.path;
  if (!filePath) {
    response.status(400).send('No file uploaded');
    return;
  }
  
  console.log(filePath);
  const file = readFileSync(filePath as string);
  // extract metadata
  // Check if the file is a tar.gz file by examining the first few bytes (magic numbers)
  const isTarGz = file.length > 3 &&
    file[0] === 0x1F &&
    file[1] === 0x8B &&
    file[2] === 0x08; // Magic numbers for gzip

  if (!isTarGz) {
    response.status(400).send('Invalid file format. Expected tar.gz file.');
    return;
  }

  try {
    const fileName = (filePath as string).split('/').reverse()[0];
    const targetPath = 'problems/' + fileName;
    
    // Check if a problem with this filename already exists
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
    const metadataPath = `${problemDir}/metadata.json`;
    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      const newProblem = new Problem({
        displayID: metadata.displayID,
        createdTime: metadata.createdTime || new Date(),
        title: metadata.title,
        fileName: fileName,
        timeLimit: metadata.timeLimit,
        memoryLimit: metadata.memoryLimit,
        tags: metadata.tags || [],
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
      console.log(`Problem ${metadata.displayID} saved to database`);
    } catch (error) {
      console.error('Error reading or parsing metadata.json:', error);
      throw error;
    }

    response.status(200).send('File uploaded and extracted successfully');
    return;
  } catch (error) {
    console.log(error);
    response.status(400).send('Error extracting file');
    return;
  }
};

const deleteProblem = async (request: IRequest, response: Response) => {
  const user = request.user as IUser;
  if (!request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOneAndDelete({ displayID });
    if (!problem) {
      response.sendStatus(404);
    }
    response.status(200).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const updateProblem = async (request: IRequest, response: Response) => {
  if (!request.user) {
    response.status(401).send('Please login first');
  }
  const { displayID } = request.params;
  const data = matchedData(request);
  console.log(data);
  try {
    if (Object.keys(data).length === 2) {
      throw {
        message: 'No matched patch data',
        error: validationResult(request).array()
      };
    }
    let problem: IProblem | null = await Problem.findOneAndUpdate({ displayID }, data);
    if (!problem) {
      response.sendStatus(404);
    }
    problem = await Problem.findOne({ displayID }).select('id displayID title createdTime');
    response.status(201).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

problemsRouter.get('/api/problems', getProblems);
problemsRouter.get('/api/problems/:displayID', getProblemById);

// Apply multer directly to the route as middleware
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

problemsRouter.delete('/api/problems/:displayID', deleteProblem);
problemsRouter.patch('/api/problems/:displayID', checkSchema(updateProblemValidation), updateProblem);

export default problemsRouter;
export { getProblems, getProblemById, createProblem, deleteProblem, updateProblem };