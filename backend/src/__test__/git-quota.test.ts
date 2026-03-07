import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGiteaWebhook } from '../routes/webhook';
import { Request, Response } from 'express';

// Mock gitea service
vi.mock('../utils/gitea-service', () => ({
    giteaService: {
        getFileContent: vi.fn().mockResolvedValue({
            content: Buffer.from('#include <stdio.h>\nint main() { return 0; }').toString('base64'),
            size: 100
        })
    }
}));

// Mock Mongoose models
const { mockProblem, mockUser, mockSubmission } = vi.hoisted(() => {
    const ProblemStatus = { Ready: 'ready' };
    const mockProblem = {
        id: 'problem123',
        serialNumber: 1001,
        title: 'Test Problem',
        status: ProblemStatus.Ready,
        dailyQuota: 1 // Strict quota for testing
    };

    const mockUser: any = {
        _id: 'user123',
        id: 'user123',
        username: 'testuser',
        giteaId: 12345,
        quotaUsage: new Map(),
        save: vi.fn(),
        role: 'student'
    };

    const mockSubmission = {
        serialNumber: 1,
        save: vi.fn().mockResolvedValue({ serialNumber: 1 })
    };

    return { mockProblem, mockUser, mockSubmission };
});

vi.mock('../mongoose/schemas/problems', () => ({
    Problem: {
        findOne: vi.fn().mockResolvedValue(mockProblem)
    },
    ProblemStatus: { Ready: 'ready' }
}));

vi.mock('../mongoose/schemas/users', () => ({
    User: {
        findOne: vi.fn().mockResolvedValue(mockUser)
    },
    UserRole: {
        Admin: 'admin',
        Student: 'student',
        TA: 'ta'
    }
}));

vi.mock('../mongoose/schemas/submission', () => ({
    Submission: vi.fn(function() { return mockSubmission; })
}));

vi.mock('../judger/judger', () => ({
    submitUserSubmission: vi.fn()
}));

vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({ isEmpty: () => true })),
    checkSchema: vi.fn(() => (req: any, res: any, next: any) => next()),
    matchedData: vi.fn((req) => req.body)
}));

describe('Git Webhook Quota Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        mockUser.quotaUsage = new Map();
        mockUser.save.mockClear();
        mockSubmission.save.mockClear();

        req = {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: {
                commits: [
                    {
                        id: 'commit123',
                        added: ['1001.c'],
                        modified: []
                    }
                ],
                repository: {
                    owner: { username: 'testuser' },
                    name: 'testuser-dsa'
                },
                pusher: {
                    id: 12345,
                    username: 'testuser'
                }
            }
        };

        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        };
    });

    it('should allow submission if quota is not exceeded', async () => {
        await handleGiteaWebhook(req as Request, res as Response);

        expect(mockUser.save).toHaveBeenCalled();
        expect(mockSubmission.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        
        // Check quota usage update
        const usage = mockUser.quotaUsage.get(mockProblem.id);
        expect(usage).toBeDefined();
        expect(usage.count).toBe(1);
    });

    it('should block submission if quota is exceeded', async () => {
        // Set up pre-existing quota usage equal to limit (1)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        mockUser.quotaUsage.set(mockProblem.id, { count: 1, date: today });

        await handleGiteaWebhook(req as Request, res as Response);

        expect(mockSubmission.save).not.toHaveBeenCalled();
        // Check res is still 200 (webhook success) but 0 submissions created
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            submissions_created: 0
        }));
    });
});
