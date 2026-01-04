import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { IRequest } from '../utils/request-interface';
import { SubmissionStatus } from '../utils/submission-status';

// Mock data
const mockSubmissions = [
    {
        serialNumber: 1000001,
        problemSerialNumber: 1,
        problemTitle: 'Problem 1',
        username: 'testuser',
        userHandle: 'Test User',
        userID: 'user123',
        status: SubmissionStatus.AC,
        language: 'python',
        createdTime: new Date('2025-01-01T00:00:00Z'),
        score: 100,
        time: 50,
        memory: 1024
    },
    {
        serialNumber: 1000002,
        problemSerialNumber: 2,
        problemTitle: 'Problem 2',
        username: 'testuser',
        userHandle: 'Test User',
        userID: 'user123',
        status: SubmissionStatus.WA,
        language: 'cpp',
        createdTime: new Date('2025-01-02T00:00:00Z'),
        score: 0,
        time: 0,
        memory: 0
    },
    {
        serialNumber: 1000003,
        problemSerialNumber: 1,
        problemTitle: 'Problem 1',
        username: 'otheruser',
        userHandle: 'Other User',
        userID: 'user456',
        status: SubmissionStatus.AC,
        language: 'python',
        createdTime: new Date('2025-01-03T00:00:00Z'),
        score: 100,
        time: 60,
        memory: 2048
    }
];

const mockSubmissionFind = vi.fn();
const mockSubmissionFindOne = vi.fn();
const mockSubmissionSelect = vi.fn();
const mockSubmissionCountDocuments = vi.fn();

// Mock Submission model
vi.mock('../mongoose/schemas/submission', () => ({
    Submission: {
        find: (query: any) => ({
            select: (fields: string) => {
                mockSubmissionSelect(fields);
                return {
                    sort: vi.fn(() => ({
                        skip: vi.fn(() => ({
                            limit: vi.fn(() => mockSubmissionFind(query))
                        }))
                    }))
                };
            }
        }),
        findOne: (query: any) => mockSubmissionFindOne(query),
        countDocuments: (query: any) => mockSubmissionCountDocuments(query)
    },
    ISubmission: {}
}));

// Mock Problem and User for createSubmission (already tested in quota.test.ts)
vi.mock('../mongoose/schemas/problems', () => ({
    Problem: {
        findOne: vi.fn()
    },
    ProblemStatus: { Ready: 'ready' }
}));

vi.mock('../mongoose/schemas/users', () => ({
    User: {
        findOne: vi.fn()
    },
    IUser: {}
}));

vi.mock('../judger/judger', () => ({
    submitUserSubmission: vi.fn()
}));

vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({ isEmpty: () => true, array: () => [] })),
    matchedData: vi.fn(() => ({})),
    checkSchema: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Import real routes
import { getSubmissions, getSubmissionByID } from '../routes/submission';

// Helper to create mock response
const createMockResponse = () => {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        sendStatus: vi.fn().mockReturnThis()
    };
    return res as Response;
};

describe('Submission Routes', () => {
    let mockRequest: Partial<IRequest>;
    let mockResponse: Response;

    beforeEach(() => {
        vi.clearAllMocks();
        mockResponse = createMockResponse();
    });

    describe('getSubmissions', () => {
        it('should return only user\'s own submissions for non-admin', async () => {
            const userSubmissions = mockSubmissions.filter(s => s.username === 'testuser');
            mockSubmissionFind.mockResolvedValue(userSubmissions);
            mockSubmissionCountDocuments.mockResolvedValue(userSubmissions.length);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', isAdmin: false } as any,
                query: {}
            };

            await getSubmissions(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockSubmissionFind).toHaveBeenCalledWith({ username: 'testuser' });
            expect(mockSubmissionCountDocuments).toHaveBeenCalledWith({ username: 'testuser' });

            // Verify response format
            expect(mockResponse.send).toHaveBeenCalledWith({
                total: userSubmissions.length,
                submissions: userSubmissions
            });

            // Verify select includes time and memory
            expect(mockSubmissionSelect).toHaveBeenCalledWith(expect.stringContaining('time'));
            expect(mockSubmissionSelect).toHaveBeenCalledWith(expect.stringContaining('memory'));
        });

        it('should return all submissions for admin', async () => {
            mockSubmissionFind.mockResolvedValue(mockSubmissions);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'admin', isAdmin: true } as any,
                query: {}
            };

            await getSubmissions(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockSubmissionFind).toHaveBeenCalledWith({});
        });

        it('should filter by problem serial number', async () => {
            const filteredSubmissions = mockSubmissions.filter(s => s.problemSerialNumber === 1);
            mockSubmissionFind.mockResolvedValue(filteredSubmissions);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', isAdmin: false } as any,
                query: { problemSerialNumber: '1' }
            };

            await getSubmissions(mockRequest as IRequest, mockResponse);

            expect(mockSubmissionFind).toHaveBeenCalledWith({
                username: 'testuser',
                problemSerialNumber: 1
            });
        });

        it('should filter by status with substring match', async () => {
            const filteredSubmissions = mockSubmissions.filter(s => s.status === SubmissionStatus.AC);
            mockSubmissionFind.mockResolvedValue(filteredSubmissions);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', isAdmin: false } as any,
                query: { status: 'AC' }
            };

            await getSubmissions(mockRequest as IRequest, mockResponse);

            expect(mockSubmissionFind).toHaveBeenCalledWith({
                username: 'testuser',
                status: { $regex: 'AC', $options: 'i' }
            });
        });

        it('should filter by username with substring match for admin', async () => {
            mockSubmissionFind.mockResolvedValue([]);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'admin', isAdmin: true } as any,
                query: { username: 'test' }
            };

            await getSubmissions(mockRequest as IRequest, mockResponse);

            expect(mockSubmissionFind).toHaveBeenCalledWith({
                username: { $regex: 'test', $options: 'i' }
            });
        });
    });

    describe('getSubmissionByID', () => {
        it('should return 404 if submission not found', async () => {
            mockSubmissionFindOne.mockResolvedValue(null);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', isAdmin: false } as any,
                params: { serialNumber: '9999999' }
            };

            await getSubmissionByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('should return submission for owner', async () => {
            mockSubmissionFindOne.mockResolvedValue(mockSubmissions[0]);

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', isAdmin: false } as any,
                params: { serialNumber: '1000001' }
            };

            await getSubmissionByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith(mockSubmissions[0]);
        });

        it('should return 403 if user tries to view other\'s submission', async () => {
            mockSubmissionFindOne.mockResolvedValue(mockSubmissions[2]); // otheruser's submission

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', isAdmin: false } as any,
                params: { serialNumber: '1000003' }
            };

            await getSubmissionByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
        });

        it('should allow admin to view any submission', async () => {
            mockSubmissionFindOne.mockResolvedValue(mockSubmissions[2]); // otheruser's submission

            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'admin', isAdmin: true } as any,
                params: { serialNumber: '1000003' }
            };

            await getSubmissionByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith(mockSubmissions[2]);
        });
    });
});
