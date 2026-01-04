import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IRequest } from '../utils/request-interface';
import { Response } from 'express';
import { SubmissionStatus } from '../utils/submission-status';

// Mock dependencies
const mockSubmitUserSubmission = vi.fn();
const mockSubmissionFind = vi.fn();
const mockSubmissionSave = vi.fn();
const mockProblemFind = vi.fn();

// Setup mocks module
vi.mock('../judger/judger', () => ({
    submitUserSubmission: (s: any) => mockSubmitUserSubmission(s)
}));

vi.mock('../mongoose/schemas/submission', () => ({
    Submission: {
        find: (q: any) => mockSubmissionFind(q)
    }
}));

vi.mock('../mongoose/schemas/problems', () => ({
    Problem: {
        find: (q: any) => mockProblemFind(q)
    }
}));

// Import the functions under test
import { rejudgeSubmissions, rejudgeProblems } from '../routes/rejudge';

describe('Batch Rejudge API', () => {
    let mockRequest: Partial<IRequest>;
    let mockResponse: Partial<Response>;
    let sendMock: any;
    let statusMock: any;

    beforeEach(() => {
        vi.clearAllMocks();

        sendMock = vi.fn();
        statusMock = vi.fn(() => ({ send: sendMock }));
        mockResponse = {
            status: statusMock,
            sendStatus: vi.fn()
        };
    });

    describe('rejudgeSubmissions', () => {
        beforeEach(() => {
            mockRequest = {
                body: { serialNumbers: [100, 101] },
                user: { isAdmin: true } as any,
                isAuthenticated: () => true
            };
        });

        it('should return 400 if serialNumbers is not an array', async () => {
            mockRequest.body = { serialNumbers: 'not-an-array' };
            await rejudgeSubmissions(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('should return 404 if no submissions found', async () => {
            mockSubmissionFind.mockResolvedValue([]);
            await rejudgeSubmissions(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('should rejudge multiple submissions', async () => {
            const mockSubmissions = [
                {
                    serialNumber: 100,
                    status: SubmissionStatus.AC,
                    score: 100,
                    results: {},
                    save: mockSubmissionSave
                },
                {
                    serialNumber: 101,
                    status: SubmissionStatus.WA,
                    score: 0,
                    results: {},
                    save: mockSubmissionSave
                }
            ];
            mockSubmissionFind.mockResolvedValue(mockSubmissions);

            await rejudgeSubmissions(mockRequest as IRequest, mockResponse as Response);

            expect(mockSubmissionFind).toHaveBeenCalledWith({ serialNumber: { $in: [100, 101] } });
            expect(mockSubmissionSave).toHaveBeenCalledTimes(2);
            expect(mockSubmitUserSubmission).toHaveBeenCalledTimes(2);
            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });

    describe('rejudgeProblems', () => {
        beforeEach(() => {
            mockRequest = {
                body: { serialNumbers: [1, 2] },
                user: { isAdmin: true } as any,
                isAuthenticated: () => true
            };
        });

        it('should return 400 if serialNumbers is not an array', async () => {
            mockRequest.body = { serialNumbers: 'not-an-array' };
            await rejudgeProblems(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('should return 404 if no problems found', async () => {
            mockProblemFind.mockResolvedValue([]);
            await rejudgeProblems(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('should rejudge submissions for multiple problems', async () => {
            const mockProblems = [
                { serialNumber: 1 },
                { serialNumber: 2 }
            ];
            mockProblemFind.mockResolvedValue(mockProblems);

            const mockSubmissions = [
                {
                    serialNumber: 100,
                    problemSerialNumber: 1,
                    status: SubmissionStatus.AC,
                    save: mockSubmissionSave
                },
                {
                    serialNumber: 101,
                    problemSerialNumber: 2,
                    status: SubmissionStatus.WA,
                    save: mockSubmissionSave
                }
            ];
            mockSubmissionFind.mockResolvedValue(mockSubmissions);

            await rejudgeProblems(mockRequest as IRequest, mockResponse as Response);

            expect(mockProblemFind).toHaveBeenCalledWith({ serialNumber: { $in: [1, 2] } });
            expect(mockSubmissionFind).toHaveBeenCalledWith({ problemSerialNumber: { $in: [1, 2] } });
            expect(mockSubmissionSave).toHaveBeenCalledTimes(2);
            expect(mockSubmitUserSubmission).toHaveBeenCalledTimes(2);
            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });
});
