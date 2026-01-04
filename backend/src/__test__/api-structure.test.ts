import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IRequest } from '../utils/request-interface';
import { Response } from 'express';
import { getProblems, getProblemByID } from '../routes/problems';
import { getAllUsers, getUserByUsername } from '../routes/users';
import { getSubmissions, getSubmissionByID } from '../routes/submission';
import { getAllContests, getContestByID } from '../routes/contests';
import { ProblemStatus } from '../mongoose/schemas/problems';

// Mock dependencies
const { mockProblem, mockUser, mockSubmission, mockContest } = vi.hoisted(() => {
    const ProblemStatus = { Ready: 'ready' };

    const mockProblem = {
        id: 'problem123',
        serialNumber: 1,
        title: 'Test Problem',
        status: ProblemStatus.Ready,
        createdTime: new Date(),
        timeLimit: 1000,
        memoryLimit: 256,
        tags: ['tag1'],
        problemRelatedTags: ['tag2'],
        submissionDetail: {},
        userDetail: {},
        fullScore: 100,
        dailyQuota: 5,
        toObject: function () { return { ...this }; }
    };

    const mockUser: any = {
        id: 'user123',
        username: 'testuser',
        displayName: 'Test User',
        quotaUsage: new Map(),
        save: vi.fn(),
        isAdmin: false,
        rating: 1500,
        solvedProblem: 10,
        solvedProblems: [1, 2],
        toObject: function () { return { ...this }; }
    };

    const mockSubmission = {
        _id: 'sub123',
        serialNumber: 1000,
        problemSerialNumber: 1,
        problemTitle: 'Test Problem',
        username: 'testuser',
        userHandle: 'Test User',
        userID: 'user123',
        status: 'AC',
        language: 'cpp',
        createdTime: new Date(),
        score: 100,
        time: 0.1,
        memory: 1024,
        results: {},
        userSolution: [{ filename: 'main.cpp', content: 'code' }]
    };

    const mockContest = {
        _id: 'contest123',
        title: 'Test Contest',
        description: 'Description',
        startTime: new Date(),
        endTime: new Date(),
        problems: [{ serialNumber: 1, score: 100 }],
        standings: [],
        createdTime: new Date()
    };

    return { mockProblem, mockUser, mockSubmission, mockContest };
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
        findOne: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(mockUser)
        }),
        find: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                sort: vi.fn().mockResolvedValue([mockUser])
            }),
            where: vi.fn().mockReturnThis(),
            equals: vi.fn().mockReturnThis()
        })
    }
}));

vi.mock('../mongoose/schemas/submission', () => ({
    Submission: {
        countDocuments: vi.fn().mockResolvedValue(1),
        find: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                sort: vi.fn().mockReturnValue({
                    skip: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockSubmission])
                    })
                })
            })
        }),
        findOne: vi.fn().mockResolvedValue(mockSubmission)
    }
}));

vi.mock('../mongoose/schemas/contests', () => ({
    Contest: {
        find: vi.fn().mockReturnValue({
            sort: vi.fn().mockResolvedValue([mockContest])
        }),
        findById: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockContest)
        })
    }
}));

vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({ isEmpty: () => true, array: () => [] })),
    matchedData: vi.fn(() => ({})),
    checkSchema: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('API Response Structure Tests', () => {
    let req: Partial<IRequest>;
    let res: Partial<Response>;

    beforeEach(() => {
        mockUser.quotaUsage = new Map();
        mockUser.save.mockClear();

        req = {
            isAuthenticated: () => true,
            user: mockUser as any,
            params: { serialNumber: '1', username: 'testuser', id: 'contest123' },
            query: {}
        } as any;

        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            sendStatus: vi.fn()
        };
    });

    describe('Problems Routes', () => {
        describe('getProblems', () => {
            it('should return problem list with correct structure including dailyQuota', async () => {
                await getProblems(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const problems: any = (res.send as any).mock.calls[0][0];
                expect(Array.isArray(problems)).toBe(true);
                expect(problems.length).toBe(1);
                
                const problem = problems[0];
                expect(problem).toHaveProperty('serialNumber');
                expect(problem).toHaveProperty('title');
                expect(problem).toHaveProperty('status');
                expect(problem).toHaveProperty('createdTime');
                expect(problem).toHaveProperty('timeLimit');
                expect(problem).toHaveProperty('memoryLimit');
                expect(problem).toHaveProperty('tags');
                expect(problem).toHaveProperty('problemRelatedTags');
                expect(problem).toHaveProperty('submissionDetail');
                expect(problem).toHaveProperty('userDetail');
                expect(problem).toHaveProperty('fullScore');
                expect(problem).toHaveProperty('dailyQuota');
                
                expect(problem.dailyQuota).toBe(5);
            });
        });

        describe('getProblemByID', () => {
            it('should return single problem with correct structure including dailyQuota', async () => {
                await getProblemByID(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const problem: any = (res.send as any).mock.calls[0][0];
                
                expect(problem).toHaveProperty('serialNumber');
                expect(problem).toHaveProperty('title');
                expect(problem).toHaveProperty('status');
                expect(problem).toHaveProperty('createdTime');
                expect(problem).toHaveProperty('timeLimit');
                expect(problem).toHaveProperty('memoryLimit');
                expect(problem).toHaveProperty('tags');
                expect(problem).toHaveProperty('problemRelatedTags');
                expect(problem).toHaveProperty('submissionDetail');
                expect(problem).toHaveProperty('userDetail');
                expect(problem).toHaveProperty('fullScore');
                expect(problem).toHaveProperty('dailyQuota');
                
                expect(problem.dailyQuota).toBe(5);
            });
        });
    });

    describe('Users Routes', () => {
        describe('getAllUsers', () => {
            it('should return user list with correct structure', async () => {
                await getAllUsers(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const users: any = (res.send as any).mock.calls[0][0];
                expect(Array.isArray(users)).toBe(true);
                expect(users.length).toBe(1);
                
                const user = users[0];
                expect(user).toHaveProperty('username');
                expect(user).toHaveProperty('displayName');
            });
        });

        describe('getUserByUsername', () => {
            it('should return single user with correct structure', async () => {
                await getUserByUsername(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const user: any = (res.send as any).mock.calls[0][0];
                
                expect(user).toHaveProperty('username');
                expect(user).toHaveProperty('displayName');
                expect(user).toHaveProperty('rating');
                expect(user).toHaveProperty('solvedProblem');
                expect(user).toHaveProperty('solvedProblems');
            });
        });
    });

    describe('Submissions Routes', () => {
        describe('getSubmissions', () => {
            it('should return submission list with correct structure', async () => {
                await getSubmissions(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const response: any = (res.send as any).mock.calls[0][0];
                expect(response).toHaveProperty('total');
                expect(response).toHaveProperty('submissions');
                expect(Array.isArray(response.submissions)).toBe(true);
                
                const submission = response.submissions[0];
                expect(submission).toHaveProperty('serialNumber');
                expect(submission).toHaveProperty('problemSerialNumber');
                expect(submission).toHaveProperty('problemTitle');
                expect(submission).toHaveProperty('username');
                expect(submission).toHaveProperty('userHandle');
                expect(submission).toHaveProperty('userID');
                expect(submission).toHaveProperty('status');
                expect(submission).toHaveProperty('language');
                expect(submission).toHaveProperty('createdTime');
                expect(submission).toHaveProperty('score');
                expect(submission).toHaveProperty('time');
                expect(submission).toHaveProperty('memory');
            });
        });

        describe('getSubmissionByID', () => {
            it('should return single submission with correct structure', async () => {
                req.params!.serialNumber = '1000';
                await getSubmissionByID(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const submission: any = (res.send as any).mock.calls[0][0];
                
                expect(submission).toHaveProperty('serialNumber');
                expect(submission).toHaveProperty('problemSerialNumber');
                expect(submission).toHaveProperty('problemTitle');
                expect(submission).toHaveProperty('username');
                expect(submission).toHaveProperty('userHandle');
                expect(submission).toHaveProperty('userID');
                expect(submission).toHaveProperty('status');
                expect(submission).toHaveProperty('language');
                expect(submission).toHaveProperty('createdTime');
                expect(submission).toHaveProperty('score');
                expect(submission).toHaveProperty('time');
                expect(submission).toHaveProperty('memory');
                expect(submission).toHaveProperty('results');
                expect(submission).toHaveProperty('userSolution');
            });
        });
    });

    describe('Contests Routes', () => {
        describe('getAllContests', () => {
            it('should return contest list with correct structure', async () => {
                await getAllContests(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const contests: any = (res.send as any).mock.calls[0][0];
                expect(Array.isArray(contests)).toBe(true);
                expect(contests.length).toBe(1);
                
                const contest = contests[0];
                expect(contest).toHaveProperty('title');
                expect(contest).toHaveProperty('description');
                expect(contest).toHaveProperty('startTime');
                expect(contest).toHaveProperty('endTime');
                expect(contest).toHaveProperty('problems');
            });
        });

        describe('getContestByID', () => {
            it('should return single contest with correct structure', async () => {
                await getContestByID(req as IRequest, res as Response);

                expect(res.status).toHaveBeenCalledWith(200);
                const contest: any = (res.send as any).mock.calls[0][0];
                
                expect(contest).toHaveProperty('title');
                expect(contest).toHaveProperty('description');
                expect(contest).toHaveProperty('startTime');
                expect(contest).toHaveProperty('endTime');
                expect(contest).toHaveProperty('problems');
            });
        });
    });
});
