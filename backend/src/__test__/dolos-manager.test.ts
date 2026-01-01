import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

// Mock dependencies BEFORE importing the module under test
vi.mock('fs');
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));
vi.mock('../mongoose/schemas/submission', () => ({
  Submission: {
    findOne: vi.fn(),
    find: vi.fn(),
  }
}));
vi.mock('../mongoose/schemas/plagiarism-report', () => ({
  PlagiarismReport: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  }
}));

// Import the module under test
import { DolosManager } from '../utils/dolos-manager';
import { Submission } from '../mongoose/schemas/submission';
import { PlagiarismReport } from '../mongoose/schemas/plagiarism-report';

describe('DolosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default fs mocks
    vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/dolos-test');
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.readdirSync).mockReturnValue(['report.json'] as any);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ pairs: [] }));
    vi.mocked(fs.rmSync).mockReturnValue(undefined);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    // Setup default exec mock
    (exec as unknown as any).mockImplementation((cmd: string, options: any, cb: any) => {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        
        // Note: Since we use util.promisify(exec), the callback must return (err, value)
        // where value is { stdout, stderr } because promisify handles child_process.exec specially
        // OR if we are mocking it as a standard function, promisify expects (err, value).
        // However, DolosManager expects { stdout } = await execAsync(...).
        // So the value returned by promisify must be an object with stdout property.
        // Standard promisify(fn) resolves to the second argument of the callback.
        // So we pass { stdout: ..., stderr: ... } as the second argument.
        
        if (cmd.includes('docker image inspect')) {
            cb(null, { stdout: 'image exists', stderr: '' });
        } else if (cmd.includes('docker run')) {
            cb(null, { stdout: '[]', stderr: '' });
        } else {
            cb(null, { stdout: '', stderr: '' });
        }
    });
  });

  it('should return null if no submissions exist', async () => {
    vi.mocked(Submission.findOne).mockResolvedValue(null);

    const result = await DolosManager.checkPlagiarism(1);

    expect(result).toBeNull();
    expect(Submission.findOne).toHaveBeenCalledWith(
      { problemSerialNumber: 1 },
      { createdTime: 1 },
      { sort: { createdTime: -1 } }
    );
  });

  it('should return cached report if fresh', async () => {
    const now = new Date();
    const latestSubmissionTime = new Date(now.getTime() - 10000); // 10s ago
    
    vi.mocked(Submission.findOne).mockResolvedValue({ createdTime: latestSubmissionTime });
    
    vi.mocked(PlagiarismReport.findOne).mockResolvedValue({
      lastSubmissionTime: latestSubmissionTime, // Same time, so fresh
      createdAt: new Date(now.getTime() - 600000), // Created 10 mins ago (expired TTL but fresh content)
      result: { cached: true }
    });

    const result = await DolosManager.checkPlagiarism(1);

    expect(result).toEqual({ cached: true });
    expect(Submission.find).not.toHaveBeenCalled(); // Should not run Dolos
  });

  it('should return cached report if within throttle period', async () => {
    const now = new Date();
    const latestSubmissionTime = new Date(now.getTime()); // Just now
    
    vi.mocked(Submission.findOne).mockResolvedValue({ createdTime: latestSubmissionTime });
    
    vi.mocked(PlagiarismReport.findOne).mockResolvedValue({
      lastSubmissionTime: new Date(now.getTime() - 10000), // Old content
      createdAt: new Date(now.getTime() - 60000), // Created 1 min ago (within 5 min TTL)
      result: { cached: true }
    });

    const result = await DolosManager.checkPlagiarism(1);

    expect(result).toEqual({ cached: true });
    expect(Submission.find).not.toHaveBeenCalled();
  });

  it('should run Dolos if cache is stale and outside throttle', async () => {
    const now = new Date();
    const latestSubmissionTime = new Date(now.getTime());
    
    vi.mocked(Submission.findOne).mockResolvedValue({ createdTime: latestSubmissionTime });
    
    vi.mocked(PlagiarismReport.findOne).mockResolvedValue({
      lastSubmissionTime: new Date(now.getTime() - 10000), // Old content
      createdAt: new Date(now.getTime() - 600000), // Created 10 mins ago (expired TTL)
      result: { cached: true }
    });

    // Mock submissions for Dolos run
    const mockSubmissions = [
      { _id: 'sub1', serialNumber: 1, userHandle: 'user1', language: 'g++ c++17', userSolution: [{ filename: 'main.cpp', content: 'code1' }] },
      { _id: 'sub2', serialNumber: 2, userHandle: 'user2', language: 'g++ c++17', userSolution: [{ filename: 'main.cpp', content: 'code2' }] }
    ];
    
    // Chain the mock to return an object with select method
    const mockFind = {
      select: vi.fn().mockResolvedValue(mockSubmissions)
    };
    vi.mocked(Submission.find).mockReturnValue(mockFind as any);

    // Mock exec to return specific Dolos output
    const dolosOutput = [
        {
            leftFile: '/input/sub1.cpp',
            rightFile: '/input/sub2.cpp',
            similarity: 0.8,
            totalOverlap: 10,
            fragments: []
        }
    ];

    (exec as unknown as any).mockImplementation((cmd: string, options: any, cb: any) => {
        if (typeof options === 'function') { cb = options; }
        
        if (cmd.includes('docker image inspect')) {
            cb(null, { stdout: 'ok', stderr: '' });
        } else if (cmd.includes('docker run')) {
            cb(null, { stdout: JSON.stringify(dolosOutput), stderr: '' });
        } else {
            cb(null, { stdout: '', stderr: '' });
        }
    });

    const result = await DolosManager.checkPlagiarism(1);

    expect(Submission.find).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('docker run'), expect.anything(), expect.anything());
    expect(PlagiarismReport.findOneAndUpdate).toHaveBeenCalled();
    
    // Verify result structure
    expect(result).toHaveLength(1);
    expect(result[0].similarity).toBe(0.8);
    expect(result[0].left.id).toBe('sub1');
    expect(result[0].right.id).toBe('sub2');
  });

  it('should return empty array if not enough submissions', async () => {
    vi.mocked(Submission.findOne).mockResolvedValue({ createdTime: new Date() });
    vi.mocked(PlagiarismReport.findOne).mockResolvedValue(null);

    const mockFind = {
      select: vi.fn().mockResolvedValue([{ serialNumber: 1 }]) // Only 1 submission
    };
    vi.mocked(Submission.find).mockReturnValue(mockFind as any);

    const result = await DolosManager.checkPlagiarism(1);

    expect(result).toEqual([]);
  });
});
