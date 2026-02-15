// backend/src/__test__/problem-grader.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProblem } from '../routes/problems';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import { Problem } from '../mongoose/schemas/problems';
import * as tar from 'tar';

// Mock dependencies
vi.mock('fs');
vi.mock('tar');
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
  exec: vi.fn()
}));
vi.mock('../mongoose/schemas/problems');
vi.mock('../utils/file-utils', () => {
    return {
        isTarGz: vi.fn(() => true)
    };
});
vi.mock('../utils/isolate-manager', () => ({
  IsolateManager: {
    withBox: vi.fn().mockImplementation(async (cb) => {
        // Mock the box object and its methods
        const mockBox = {
            getBoxDir: vi.fn().mockReturnValue('/tmp/box'),
            copyToBox: vi.fn(),
            run: vi.fn(),
        };
        await cb(mockBox);
    })
  }
}));

describe('Problem Grader Support', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseSend: any;
  let responseStatus: any;
  let responseJson: any;

  beforeEach(async () => {
    vi.resetAllMocks();

    responseSend = vi.fn();
    responseJson = vi.fn();
    responseStatus = vi.fn().mockReturnValue({ send: responseSend, json: responseJson });
    
    // Assign mockResponse
    mockResponse = {
        status: responseStatus,
        send: responseSend,
        json: responseJson,
        locals: {},
    } as any;

    mockRequest = {
      // ... (rest of request mock same as before)
      file: {
        path: '/tmp/upload/test.tar.gz',
        originalname: 'test.tar.gz',
        fieldname: 'problem',
        encoding: '7bit',
        mimetype: 'application/gzip',
        size: 1024,
        destination: '/uploads',
        filename: 'test.tar.gz',
        buffer: Buffer.from('')
      },
      user: {
        _id: '123',
        username: 'judge',
        email: 'judge@example.com',
        role: 'JudgeAdmin', // Ensure authorized
        password: 'hash'
      }
    } as any;

    // Mock existsSync
    (fs.existsSync as any).mockImplementation((path: string) => {
        // Return true only for 'grader' when we want it to exist
        // For other paths, return true to avoid unrelated errors (like checking if generated_testcases exists)
        if (typeof path === 'string' && path.endsWith('grader')) {
             // Logic will be overridden in tests
             return true; 
        }
        return true;
    });

    // Mock statSync
    (fs.statSync as any).mockImplementation((path: string) => {
        return { isDirectory: () => true, size: 1000 };
    });

    // Mock mkdirSync and renameSync
    (fs.mkdirSync as any).mockImplementation(() => {});
    (fs.renameSync as any).mockImplementation(() => {});
    (fs.rmSync as any).mockImplementation(() => {});

    // Mock spawnSync
    const { spawnSync } = await import('child_process');
    (spawnSync as any).mockReturnValue({ status: 0 });
    
    // Mock Problem constructor and static methods
    const mockProblemInstance = {
      _id: 'new_problem_id',
      serialNumber: 1,
      save: vi.fn().mockResolvedValue(true),
      toObject: vi.fn().mockReturnValue({ serialNumber: 1 })
    };

    // We need to ensuring the mock implementation handles 'new' correctly
    // Since we can't easily change the type of the imported mock if it's not already a class,
    // we can try to mock the implementation to return the instance directly.
    
    // @ts-ignore
    Problem.mockImplementation(function(data) {
        return {
            ...data,
            ...mockProblemInstance,
            // Ensure serialNumber is present if not in data
            serialNumber: mockProblemInstance.serialNumber
        };
    });

    // @ts-ignore
    Problem.findOne = vi.fn().mockResolvedValue(null);
    // @ts-ignore
    Problem.findByIdAndUpdate = vi.fn().mockResolvedValue(mockProblemInstance);
  });

     // Mock statSync to confirm it is a directory
  it('should create a problem with hasGrader=true when problem.json says true and grader dir exists', async () => {
    // Setup specific mocks for this test case
    const problemJson = JSON.stringify({
      title: 'Test Problem',
      time_limit: 1000,
      memory_limit: 256,
      score_policy: 'sum',
      has_grader: true, // Key: requesting grader
      createdTime: new Date()
    });

    (fs.readFileSync as any).mockImplementation((path: string) => {
      if (path.endsWith('problem.json')) return problemJson;
      if (path.endsWith('judgemeta.json')) return '{}';
      return '';
    });

    // Mock existsSync
    (fs.existsSync as any).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.endsWith('grader')) return true;
      return true;
    });

    // Mock statSync
    (fs.statSync as any).mockImplementation((path: string) => {
         if (typeof path === 'string' && path.endsWith('grader')) {
             return { isDirectory: () => true, size: 0 };
         }
         return { isDirectory: () => true, size: 100 };
    });

    await createProblem(mockRequest as Request, mockResponse as Response);

    // Verify
    expect(responseStatus).toHaveBeenCalledWith(201);
    expect(Problem).toHaveBeenCalledWith(expect.objectContaining({
      hasGrader: true
    }));
  });

  it('should create a problem with hasGrader=false when problem.json says false/undefined and no grader dir', async () => {
    const problemJson = JSON.stringify({
      title: 'Test Problem',
      has_grader: false 
    });

    (fs.readFileSync as any).mockImplementation((path: string) => {
      if (path.endsWith('problem.json')) return problemJson;
      return '{}';
    });

    // Mock existsSync to return FALSE for 'grader' directory check
    (fs.existsSync as any).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.endsWith('grader')) return false;
      return true; 
    });

    await createProblem(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toHaveBeenCalledWith(201);
    expect(Problem).toHaveBeenCalledWith(expect.objectContaining({
      hasGrader: false
    }));
  });

  it('should reject creation if problem.json says has_grader=true but grader dir is missing', async () => {
    const problemJson = JSON.stringify({
      title: 'Test Problem',
      has_grader: true // Expecting grader
    });

    (fs.readFileSync as any).mockImplementation((path: string) => {
      if (path.endsWith('problem.json')) return problemJson;
      return '{}';
    });

    // Mock existsSync to return FALSE for 'grader' directory check
    (fs.existsSync as any).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.endsWith('grader')) return false;
      return true;
    });

    await createProblem(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toHaveBeenCalledWith(400); // Bad Request
    expect(responseSend).toHaveBeenCalledWith(expect.stringContaining('does not match problem structure'));
  });

  it('should reject creation if problem.json says has_grader=false but grader dir exists', async () => {
    const problemJson = JSON.stringify({
      title: 'Test Problem',
      has_grader: false // NOT Expecting grader
    });

    (fs.readFileSync as any).mockImplementation((path: string) => {
      if (path.endsWith('problem.json')) return problemJson;
      return '{}';
    });

    // Mock existsSync to return TRUE for 'grader' directory check
    (fs.existsSync as any).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.endsWith('grader')) return true;
      return true;
    });
    
    (fs.statSync as any).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('grader')) {
            return { isDirectory: () => true };
        }
        return { isDirectory: () => true, size: 100 };
    });

    await createProblem(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toHaveBeenCalledWith(400); // Bad Request
    expect(responseSend).toHaveBeenCalledWith(expect.stringContaining('does not match problem structure'));
  });
});
