import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { uploadProblem } from '../utils/multer-config';
import { IRequest } from '../utils/request-interface';
import { createProblem } from '../routes/problems';
import { Response } from 'express';
import multer from 'multer';

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
  readFileSync: vi.fn().mockReturnValue(Buffer.from([0x1F, 0x8B, 0x08, 0x00]))
}));

vi.mock('tar', () => ({
  x: vi.fn().mockResolvedValue(undefined)
}));

describe('problem upload', () => {
  it('should upload a file and process it', async () => {
    const request = {
      file: {
        path: 'mocked-file-path.tar.gz'
      }
    } as IRequest;
    
    const response = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      })
    } as unknown as Response;

    await createProblem(request, response);
    expect(response.status).toHaveBeenCalledWith(200);
  });
  
  it('should handle multer upload errors', () => {
    const mockReq = {} as IRequest;
    const mockRes = {
      status: vi.fn(() => {
        return { send: vi.fn() };
      })
    } as unknown as Response;
    
    // Re-mock uploadProblem to simulate an error
    const mockUploadProblem = uploadProblem as unknown as vi.Mock;
    mockUploadProblem.mockImplementationOnce((req, res, callback) => {
      callback(new multer.MulterError('LIMIT_FILE_SIZE', 'file'));
    });
    
    // Create a handler function like the one in the router
    const handler = (req: IRequest, res: Response) => {
      uploadProblem(req, res, (err: any) => {
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