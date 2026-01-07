import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IRequest } from '../utils/request-interface';
import { Response } from 'express';
import { createSubmission } from '../routes/submission';
import { getProblems, getProblemByID } from '../routes/problems';
import { ProblemStatus } from '../mongoose/schemas/problems';
import { UserRole } from '../mongoose/schemas/users';

vi.mock('fs', () => ({
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => 'mock content'),
    promises: {
        readFile: vi.fn().mockResolvedValue('mock content')
    }
}));

// Mock dependencies
const { mockProblem, mockUser, mockSubmission } = vi.hoisted(() => {
    const ProblemStatus = { Ready: 'ready' };

    const mockProblem = {
        id: 'problem123',
        serialNumber: 1,
        title: 'Test Problem',
        status: ProblemStatus.Ready,
        dailyQuota: 3,
        released: true,
        toObject: function () { return { ...this }; }
    };

    const mockUser: any = {
        id: 'user123',
        username: 'testuser',
        displayName: 'Test User',
        quotaUsage: new Map(),
        save: vi.fn(),
        role: 'student'
    };

    const mockSubmission = {
        _id: 'submission123',
        status: 'Pending',
        save: vi.fn().mockResolvedValue({ _id: 'submission123', status: 'Pending' })
    };

    return { mockProblem, mockUser, mockSubmission };
});

vi.mock('../mongoose/schemas/problems', () => ({
    Problem: {
        findOne: vi.fn().mockReturnValue(mockProblem),
        find: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                sort: vi.fn().mockResolvedValue([mockProblem])
            })
        }),
        ProblemStatus: { Ready: 'ready' }
    },
    ProblemStatus: { Ready: 'ready' }
}));

vi.mock('../mongoose/schemas/users', () => ({
    User: {
        findOne: vi.fn().mockResolvedValue(mockUser)
    },
    UserRole: {
        Student: 'student',
        TA: 'ta',
        JudgeAdmin: 'judgeAdmin'
    }
}));

vi.mock('../mongoose/schemas/submission', () => ({
    Submission: vi.fn(() => mockSubmission)
}));

vi.mock('../judger/judger', () => ({
    submitUserSubmission: vi.fn()
}));

vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({ isEmpty: () => true })),
    matchedData: vi.fn(() => ({ code: 'print("hello")', language: 'python', problemSerialNumber: 1 })),
    checkSchema: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('Daily Quota Tests', () => {
    let req: Partial<IRequest>;
    let res: Partial<Response>;

    beforeEach(() => {
        mockUser.quotaUsage = new Map();
        mockUser.save.mockClear();

        req = {
            isAuthenticated: () => true,
            user: mockUser as any,
            params: { serialNumber: '1' }
        } as any;

        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            sendStatus: vi.fn()
        };
    });

    describe('createSubmission', () => {
        it('should allow submission if quota is not exceeded', async () => {
            await createSubmission(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(201);
            const usage = mockUser.quotaUsage.get('problem123');
            expect(usage).toBeDefined();
            expect(usage.count).toBe(1);
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should block submission if quota is exceeded', async () => {
            // Simulate quota used up
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            mockUser.quotaUsage.set('problem123', { count: 3, date: today });

            await createSubmission(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(429);
            // count should not increase
            expect(mockUser.quotaUsage.get('problem123').count).toBe(3);
        });

        it('should reset quota if date is old', async () => {
            // Simulate old usage
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            mockUser.quotaUsage.set('problem123', { count: 3, date: yesterday });

            await createSubmission(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(201);
            // count should reset to 1 (new submission)
            const usage = mockUser.quotaUsage.get('problem123');
            expect(usage.count).toBe(1);
            // date should be today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expect(usage.date.getTime()).toBe(today.getTime());
        });
    });

    describe('getProblems', () => {
        it('should show correct remaining quota', async () => {
            // User used 1
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            mockUser.quotaUsage.set('problem123', { count: 1, date: today });

            await getProblems(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            const problems: any = (res.send as any).mock.calls[0][0];
            expect(problems[0].dailyQuota).toBe(2); // 3 - 1 = 2
        });

        it('should show max quota if no usage', async () => {
            await getProblems(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            const problems: any = (res.send as any).mock.calls[0][0];
            expect(problems[0].dailyQuota).toBe(3);
        });
    });

    describe('getProblemByID', () => {
        it('should show correct remaining quota', async () => {
            // User used 2
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            mockUser.quotaUsage.set('problem123', { count: 2, date: today });

            await getProblemByID(req as IRequest, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            const problem: any = (res.send as any).mock.calls[0][0];
            expect(problem.dailyQuota).toBe(1); // 3 - 2 = 1
        });
    });
});
