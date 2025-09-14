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
      .select('id displayID title createdTime timeLimit memoryLimit tags problemRelatedTags submissionDetail userDetail')
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
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ displayID });
    if (!problem) {
      response.sendStatus(404);
      return;
    }
    
    const problemDir = 'problems/' + displayID;
    const metadataPath = `${problemDir}/metadata.json`;
    
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
      
      try {
        const newProblem = new Problem({
          displayID: metadata.displayID,
          createdTime: metadata.createdTime || new Date(),
          title: metadata.title,
          fileName: fileName,
          timeLimit: metadata.timeLimit,
          memoryLimit: metadata.memoryLimit,
          scorePolicy: metadata.scorePolicy,
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
        response.status(403).send('Problem with this displayID already exists');
        return;
      }
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
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ displayID });
    if (!problem) {
      response.sendStatus(404);
      return;
    }
    
    const fileName = problem.displayID;
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
    await Problem.findOneAndDelete({ displayID });
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

const updateProblemWithFile = async (request: IRequest, response: Response): Promise<void> => {
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const { displayID } = request.params;
  const filePath = request.file?.path;
  if (!filePath) {
    response.status(400).send('No file uploaded');
    return;
  }
  
  try {
    // First check if the problem exists
    const existingProblem: IProblem | null = await Problem.findOne({ displayID });
    if (!existingProblem) {
      response.status(404).send('Problem not found');
      return;
    }

    console.log(`Updating problem: ${displayID}`);
    const file = readFileSync(filePath as string);
    // Check if the file is a tar.gz file
    if (!isTarGz(file)) {
      response.status(400).send('Invalid file format. Expected tar.gz file.');
      return;
    }

    const fileName = (filePath as string).split('/').reverse()[0];
    const targetPath = 'problems/' + fileName;
    
    // Delete the old problem directory and tar.gz file if they exist
    try {
      const problemDir = 'problems/' + existingProblem.displayID;
      const oldTarFilePath = 'problems/' + existingProblem.displayID + '.tar.gz';
      
      if (problemDir.indexOf('..') !== -1 || oldTarFilePath.indexOf('..') !== -1) {
        throw new Error('Invalid file path');
      }
      
      spawnSync('rm', ['-rf', problemDir]);
      spawnSync('rm', ['-f', oldTarFilePath]);
    } catch (fsError) {
      console.error('Error deleting existing problem files:', fsError);
      // Continue with the update even if deletion fails
    }
    
    // Move new file to problems directory
    spawnSync('mv', [filePath as string, targetPath]);
    
    // Extract the tar.gz file
    await tar.x({
      file: targetPath,
      cwd: 'problems/'
    });

    const problemDir = 'problems/' + displayID;
    const metadataPath = `${problemDir}/metadata.json`;
    
    try {
      const metadataContent = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      // Update the problem in the database
      const updatedProblem = await Problem.findOneAndUpdate({ displayID }, {
        title: metadata.title,
        timeLimit: metadata.timeLimit,
        memoryLimit: metadata.memoryLimit,
        tags: metadata.tags || [],
        problemRelatedTags: metadata.problemRelatedTags || [],
        // Keep the existing submission counts
        description: metadata.description,
        inputFormat: metadata.inputFormat,
        outputFormat: metadata.outputFormat,
        scorePolicy: metadata.scorePolicy,
        testcase: metadata.testcase
      }, { new: true });

      if (!updatedProblem) {
        response.status(404).send('Problem not found after update');
        return;
      }
      
      console.log(`Problem ${displayID} updated successfully`);
      response.status(200).send(updatedProblem);
    } catch (error) {
      console.error('Error reading or parsing metadata.json:', error);
      response.status(400).send('Error reading problem metadata');
    }
  } catch (error) {
    console.log(error);
    response.status(400).send('Error updating problem');
  }
};

problemsRouter.get('/api/problems', getProblems);
problemsRouter.get('/api/problems/:displayID', getProblemById);

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

problemsRouter.put('/api/problems/:displayID', (request: IRequest, response: Response, next) => {
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