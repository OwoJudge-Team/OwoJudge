import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { IRequest } from '../utils/request-interface';
import { SubmissionStatus } from '../utils/submission-status';

// Use vi.hoisted to properly hoist mock function declarations
const {
    mockContestFind,
    mockContestFindById,
    mockContestFindByIdAndUpdate,
    mockContestFindByIdAndDelete,
    mockSubmissionFind,
    mockSubmissionDistinct,
    mockContestSave
} = vi.hoisted(() => ({
    mockContestFind: vi.fn(),
    mockContestFindById: vi.fn(),
    mockContestFindByIdAndUpdate: vi.fn(),
    mockContestFindByIdAndDelete: vi.fn(),
    mockSubmissionFind: vi.fn(),
    mockSubmissionDistinct: vi.fn(),
    mockContestSave: vi.fn()
}));

// Mock Contest model - handles both direct findById and findById().populate() patterns
vi.mock('../mongoose/schemas/contests', () => {
    const ContestMock = function (data: any) {
        return {
            ...data,
            save: mockContestSave
        };
    };
    ContestMock.find = () => ({ sort: mockContestFind });
    ContestMock.findById = (id: string) => {
        // Return an object that can be used directly or chained with .populate()
        const promise = mockContestFindById(id);
        return {
            populate: () => promise,
            then: (resolve: any, reject: any) => promise.then(resolve, reject),
            catch: (reject: any) => promise.catch(reject)
        };
    };
    ContestMock.findByIdAndUpdate = mockContestFindByIdAndUpdate;
    ContestMock.findByIdAndDelete = mockContestFindByIdAndDelete;

    return {
        Contest: ContestMock,
        IContest: {}
    };
});

// Mock Submission model
vi.mock('../mongoose/schemas/submission', () => ({
    Submission: {
        find: (query: any) => ({ sort: () => mockSubmissionFind(query) }),
        distinct: (field: string, query: any) => mockSubmissionDistinct(query)
    }
}));

// Mock validation
vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({ isEmpty: () => true, array: () => [] })),
    checkSchema: vi.fn(() => (req: any, res: any, next: any) => next())
}));

import {
    getAllContests,
    getContestByID,
    createContest,
    updateContest,
    deleteContest,
    getStandings,
    updateStandings
} from '../routes/contests';

// Helper to create mock response
const createMockResponse = () => {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        sendStatus: vi.fn().mockReturnThis()
    };
    return res as Response;
};

// Mock data
const createMockContest = (overrides = {}) => ({
    _id: 'contest1',
    title: 'Contest 1',
    description: 'First contest',
    startTime: new Date('2025-01-01T00:00:00Z'),
    endTime: new Date('2025-01-01T05:00:00Z'),
    problems: [{ serialNumber: 1, score: 100 }],
    standings: [],
    save: vi.fn().mockResolvedValue(true),
    markModified: vi.fn(),
    ...overrides
});

describe('Contest Routes', () => {
    let mockRequest: Partial<IRequest>;
    let mockResponse: Response;

    beforeEach(() => {
        vi.clearAllMocks();
        mockResponse = createMockResponse();
    });

    describe('getAllContests', () => {
        it('should return all contests sorted', async () => {
            const contests = [createMockContest(), createMockContest({ _id: 'contest2', title: 'Contest 2' })];
            mockContestFind.mockResolvedValue(contests);
            mockRequest = {};

            await getAllContests(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith(contests);
        });

        it('should handle database errors', async () => {
            mockContestFind.mockRejectedValue(new Error('Database error'));
            mockRequest = {};

            await getAllContests(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getContestByID', () => {
        it('should return contest with populated problems', async () => {
            const contest = createMockContest();
            mockContestFindById.mockResolvedValue(contest);
            mockRequest = { params: { id: 'contest1' } };

            await getContestByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith(contest);
        });

        it('should return 400 if no ID provided', async () => {
            mockRequest = { params: {} };

            await getContestByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if contest not found', async () => {
            mockContestFindById.mockResolvedValue(null);
            mockRequest = { params: { id: 'nonexistent' } };

            await getContestByID(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
        });
    });

    describe('createContest', () => {
        it('should create contest when admin', async () => {
            const savedContest = createMockContest();
            mockContestSave.mockResolvedValue(savedContest);
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                body: {
                    title: 'New Contest',
                    description: 'Description',
                    startTime: new Date(),
                    endTime: new Date(),
                    problems: []
                }
            };

            await createContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });
    });

    describe('updateContest', () => {
        it('should update contest when admin', async () => {
            mockContestFindByIdAndUpdate.mockResolvedValue(createMockContest({ title: 'Updated' }));
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: { id: 'contest1' },
                body: { title: 'Updated' }
            };

            await updateContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if no ID provided', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: {},
                body: {}
            };

            await updateContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if contest not found', async () => {
            mockContestFindByIdAndUpdate.mockResolvedValue(null);
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: { id: 'nonexistent' },
                body: { title: 'Updated' }
            };

            await updateContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });
    });

    describe('deleteContest', () => {
        it('should delete contest when admin', async () => {
            mockContestFindByIdAndDelete.mockResolvedValue(createMockContest());
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: { id: 'contest1' }
            };

            await deleteContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });


        it('should return 404 if contest not found', async () => {
            mockContestFindByIdAndDelete.mockResolvedValue(null);
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: { id: 'nonexistent' }
            };

            await deleteContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
        });
    });

    describe('getStandings', () => {
        it('should return sorted standings', async () => {
            const contestWithStandings = createMockContest({
                standings: [
                    { username: 'user1', totalScore: 50, submissionCount: 1 },
                    { username: 'user2', totalScore: 100, submissionCount: 5 },
                    { username: 'user3', totalScore: 100, submissionCount: 2 }
                ]
            });
            mockContestFindById.mockResolvedValue(contestWithStandings);
            mockRequest = { params: { id: 'contest1' } };

            await getStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // Verify standings are sorted: user3 (100, count 2), user2 (100, count 5), user1 (50, count 1)
            const sentStandings = (mockResponse.send as any).mock.calls[0][0];
            expect(sentStandings[0].username).toBe('user3'); // 100 points, lower count
            expect(sentStandings[1].username).toBe('user2'); // 100 points, higher count
            expect(sentStandings[2].username).toBe('user1'); // 50 points
        });

        it('should return 400 if no ID provided', async () => {
            mockRequest = { params: {} };

            await getStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if contest not found', async () => {
            mockContestFindById.mockResolvedValue(null);
            mockRequest = { params: { id: 'nonexistent' } };

            await getStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
        });
    });

    describe('updateStandings', () => {

        it('should return 400 if no ID provided', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: {}
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if contest not found', async () => {
            mockContestFindById.mockResolvedValue(null);
            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: { id: 'nonexistent' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
        });

        it('should calculate standings from submissions', async () => {
            const contestToUpdate = createMockContest({
                problems: [{ serialNumber: 1, score: 100 }, { serialNumber: 2, score: 100 }],
                standings: []
            });
            mockContestFindById.mockResolvedValue(contestToUpdate);
            // Mock submission usernames for distinct
            mockSubmissionDistinct.mockResolvedValue(['user1', 'user2']);

            const user1Submissions = [
                { username: 'user1', problemSerialNumber: 1, score: 50, status: SubmissionStatus.AC, createdAt: new Date('2025-01-01T01:00:00Z') },
                { username: 'user1', problemSerialNumber: 1, score: 80, status: SubmissionStatus.AC, createdAt: new Date('2025-01-01T02:00:00Z') }
            ];
            const user2Submissions = [
                 { username: 'user2', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: new Date('2025-01-01T01:30:00Z') }
            ];

            mockSubmissionFind.mockImplementation((query) => {
                if (query.username === 'user1') return Promise.resolve(user1Submissions);
                if (query.username === 'user2') return Promise.resolve(user2Submissions);
                return Promise.resolve([]);
            });

            mockRequest = {
                isAuthenticated: () => true,
                user: { isAdmin: true } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            expect(contestToUpdate.save).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);

            // Verify standings were calculated
            // We can't verify length easily if logic creates new array, but mock object is modified in place in util?
            // "contest.standings = []" inside recalculateContestStandings logic clears it.
            // But verify calls happened.
            expect(mockSubmissionDistinct).toHaveBeenCalled();
            expect(mockSubmissionFind).toHaveBeenCalled();

            // user1 should have score 80 (best attempt)
             const user1Standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(user1Standing?.totalScore).toBe(80);

            // user2 should have score 100
            const user2Standing = contestToUpdate.standings.find((s: any) => s.username === 'user2');
            expect(user2Standing?.totalScore).toBe(100);
        });
    });
});
