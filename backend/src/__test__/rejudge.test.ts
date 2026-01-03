import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IRequest } from '../utils/request-interface';
import { Response } from 'express';
import { SubmissionStatus } from '../utils/submission-status';

// Mock values
const MOCK_DATE = new Date('2025-01-01T00:00:00.000Z');

// Mock dependencies
const mockSubmitUserSubmission = vi.fn();
const mockSubmissionFindOne = vi.fn();
const mockSubmissionFind = vi.fn();
const mockSubmissionSave = vi.fn().mockResolvedValue({
    serialNumber: 100,
    status: SubmissionStatus.PD,
    score: 0,
    results: [],
    createdTime: MOCK_DATE
});

const mockProblemFindOne = vi.fn();

// Setup mocks module
vi.mock('../judger/judger', () => ({
    submitUserSubmission: (s: any) => mockSubmitUserSubmission(s)
}));

vi.mock('../mongoose/schemas/submission', () => ({
    Submission: {
        findOne: (q: any) => mockSubmissionFindOne(q),
        find: (q: any) => mockSubmissionFind(q)
    },
    ISubmission: {}
}));

vi.mock('../mongoose/schemas/problems', () => ({
    Problem: {
        findOne: (q: any) => mockProblemFindOne(q)
    },
    IProblem: {}
}));

// Import the functions under test
import { rejudgeSubmission } from '../routes/submission';
import { rejudgeProblem } from '../routes/problems';

describe('Rejudge API', () => {
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

    describe('rejudgeSubmission', () => {
        beforeEach(() => {
            mockRequest = {
                params: { serialNumber: '100' },
                user: { isAdmin: true } as any,
                isAuthenticated: () => true
            };
        });

        it('should return 401 if not authenticated', async () => {
            mockRequest.isAuthenticated = () => false;
            await rejudgeSubmission(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('should return 403 if not admin', async () => {
            mockRequest.user = { isAdmin: false } as any;
            await rejudgeSubmission(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('should return 404 if submission not found', async () => {
            mockSubmissionFindOne.mockResolvedValue(null);
            await rejudgeSubmission(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('should reset submission and trigger rejudge', async () => {
            const mockSubmission = {
                serialNumber: 100,
                status: SubmissionStatus.AC,
                score: 100,
                results: [{ testcase: '1', status: SubmissionStatus.AC }],
                save: mockSubmissionSave
            };
            mockSubmissionFindOne.mockResolvedValue(mockSubmission);

            await rejudgeSubmission(mockRequest as IRequest, mockResponse as Response);

            expect(mockSubmission.status).toBe(SubmissionStatus.PD);
            expect(mockSubmission.score).toBe(0);
            expect(mockSubmission.results).toEqual({});
            expect(mockSubmission.save).toHaveBeenCalled();
            expect(mockSubmitUserSubmission).toHaveBeenCalledWith(mockSubmission);
            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });

    describe('rejudgeProblem', () => {
        beforeEach(() => {
            mockRequest = {
                params: { serialNumber: '1001' },
                user: { isAdmin: true } as any,
                isAuthenticated: () => true
            };
        });

        it('should return 403 if not admin', async () => {
            mockRequest.user = { isAdmin: false } as any;
            await rejudgeProblem(mockRequest as IRequest, mockResponse as Response);
            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('should return 404 if problem not found', async () => {
            mockProblemFindOne.mockResolvedValue(null);
            await rejudgeProblem(mockRequest as IRequest, mockResponse as Response);
            expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
        });

        it('should rejudge all submissions for the problem', async () => {
            const mockProblem = { serialNumber: 1001 };
            const mockSubmission1 = {
                serialNumber: 101,
                status: SubmissionStatus.AC,
                score: 100,
                results: [...Array(5)],
                save: vi.fn(),
                problemSerialNumber: 1001
            };
            const mockSubmission2 = {
                serialNumber: 102,
                status: SubmissionStatus.WA,
                score: 0,
                results: [...Array(5)],
                save: vi.fn(),
                problemSerialNumber: 1001
            };

            mockProblemFindOne.mockResolvedValue(mockProblem);
            mockSubmissionFind.mockResolvedValue([mockSubmission1, mockSubmission2]);

            await rejudgeProblem(mockRequest as IRequest, mockResponse as Response);

            expect(mockSubmissionFind).toHaveBeenCalledWith({ problemSerialNumber: 1001 });

            // Check submission 1
            expect(mockSubmission1.status).toBe(SubmissionStatus.PD);
            expect(mockSubmission1.score).toBe(0);
            expect(mockSubmission1.results).toEqual({});
            expect(mockSubmission1.save).toHaveBeenCalled();

            // Check submission 2
            expect(mockSubmission2.status).toBe(SubmissionStatus.PD);
            expect(mockSubmission2.score).toBe(0);
            expect(mockSubmission2.results).toEqual({});
            expect(mockSubmission2.save).toHaveBeenCalled();

            expect(mockSubmitUserSubmission).toHaveBeenCalledTimes(2);
            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });
});
