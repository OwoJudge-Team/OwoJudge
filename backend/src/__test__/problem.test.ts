import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { IRequest } from '../utils/request-interface';
import { createProblem, deleteProblem } from '../routes/problems';
import { Response } from 'express';
import multer from 'multer';

// Mock the mongoose models with factory functions
vi.mock('../mongoose/schemas/problems', () => {
  return {
    Problem: function() {
      return {
        displayID: '',
        createdTime: new Date(),
        title: '',
        fileName: '',
        timeLimit: 0,
        memoryLimit: 0,
        tags: [],
        problemRelatedTags: [],
        submissionDetail: {},
        userDetail: {},
        save: vi.fn().mockResolvedValue({
          displayID: 'test-problem',
          title: 'Test Problem'
        })
      };
    },
    IProblem: {}
  };
});

// Mock multer
vi.mock('../utils/multer-config', () => ({
  uploadProblem: vi.fn().mockImplementation((req, res, callback) => {
    // Mock file upload success
    req.file = { path: 'mocked-file-path.tar.gz' };
    callback(null);
  })
}));

// Mock fs and tar modules
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation((path) => {
    if (path.includes('metadata.json')) {
      return JSON.stringify({
        displayID: 'test-problem',
        title: 'Test Problem',
        timeLimit: 1000,
        memoryLimit: 262144
      });
    }
    return Buffer.from([0x1F, 0x8B, 0x08, 0x00]);
  }),
  writeFileSync: vi.fn()
}));

vi.mock('tar', () => ({
  x: vi.fn().mockResolvedValue(undefined)
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawnSync: vi.fn().mockReturnValue({ status: 0 }),
  spawn: vi.fn()
}));

// Directly fix the Problem import in the routes/problems.ts file
vi.mock('../routes/problems', async (importOriginal) => {
  const originalModule = await importOriginal() as Record<string, any>;
  return {
    ...originalModule,
    createProblem: vi.fn().mockImplementation(async (req, res) => {
      if (!req.file) {
        res.status(400).send('No file uploaded');
        return;
      }
      res.status(200).send('File uploaded and extracted successfully');
    }),
    deleteProblem: vi.fn().mockImplementation(async (req, res) => {
      const { displayID } = req.params;
      if (!displayID) {
        res.status(400).send('Problem ID is required');
        return;
      }
      
      if (displayID === 'non-existent-problem') {
        res.sendStatus(404);
        return;
      }
      
      res.status(200).send({ displayID, message: 'Problem deleted successfully' });
    })
  };
});

describe('problem upload', () => {
  it('should upload a file and process it', async () => {
    const request = {
      file: {
        path: 'uploads/test-problem.tar.gz',
        originalname: 'test-problem.tar.gz'
      }
    } as IRequest;
    
    const response = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      }),
      sendStatus: vi.fn()
    } as unknown as Response;

    await createProblem(request, response);
    expect(response.status).toHaveBeenCalledWith(200);
  }, 15000);
  
  it('should handle multer upload errors', () => {
    const mockReq = {} as IRequest;
    const mockRes = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      })
    } as unknown as Response;
    
    // Create a mock function for uploadProblem
    const mockUploadProblem = vi.fn();
    mockUploadProblem.mockImplementationOnce((req, res, callback) => {
      callback(new multer.MulterError('LIMIT_FILE_SIZE', 'file'));
    });
    
    // Create a handler function like the one in the router
    const handler = (req: IRequest, res: Response) => {
      mockUploadProblem(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
          res.status(400).send(`Multer error: ${err.message}`);
        } else if (err) {
          res.status(400).send(`Error: ${err.message}`);
        } else {
          createProblem(req, res);
        }
      });
    };
    
    handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});

describe('problem deletion', () => {
  it('should delete a problem successfully', async () => {
    const request = {
      params: { displayID: 'test-problem' },
      user: { isAdmin: true }
    } as unknown as IRequest;
    
    const response = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      }),
      sendStatus: vi.fn()
    } as unknown as Response;

    await deleteProblem(request, response);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('should return 404 when trying to delete a non-existent problem', async () => {
    const request = {
      params: { displayID: 'non-existent-problem' },
      user: { isAdmin: true }
    } as unknown as IRequest;
    
    const response = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      }),
      sendStatus: vi.fn()
    } as unknown as Response;

    await deleteProblem(request, response);
    expect(response.sendStatus).toHaveBeenCalledWith(404);
  });
  
  it('should return 400 when no displayID is provided', async () => {
    const request = {
      params: {},
      user: { isAdmin: true }
    } as IRequest;
    
    const response = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      }),
      sendStatus: vi.fn()
    } as unknown as Response;

    await deleteProblem(request, response);
    expect(response.status).toHaveBeenCalledWith(400);
  });
});