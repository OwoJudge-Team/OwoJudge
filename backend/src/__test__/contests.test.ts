import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { IRequest } from '../utils/request-interface';
import { SubmissionStatus } from '../utils/submission-status';
import { UserRole } from '../mongoose/schemas/users';

// Use vi.hoisted to properly hoist mock function declarations
const {
    setCurrentMockContest,
    mockContestFind,
    mockContestFindDirect,
    mockContestFindById,
    mockContestFindByIdAndUpdate,
    mockContestFindByIdAndDelete,
    mockContestFindOneAndUpdate,
    mockSubmissionFind,
    mockSubmissionDistinct,
    mockContestSave
} = vi.hoisted(() => {
    let currentMockContest: any = null;
    return {
        setCurrentMockContest: (contest: any) => { currentMockContest = contest; },
        mockContestFind: vi.fn(),
        // Used when Contest.find(...) is awaited directly (e.g. cross-contest GM budget query)
        mockContestFindDirect: vi.fn().mockResolvedValue([]),
        mockContestFindById: vi.fn(),
        mockContestFindByIdAndUpdate: vi.fn().mockImplementation(async (_query: any, update: any) => {
            if (!currentMockContest) return null;
            // Handle standings full-array replacement: findByIdAndUpdate(id, { $set: { standings: [...] } })
            if (update.$set && Array.isArray(update.$set.standings)) {
                currentMockContest.standings = update.$set.standings;
                return currentMockContest;
            }
            // Handle direct field replacement: findByIdAndUpdate(id, { standings: [...] })
            if (Array.isArray(update.standings)) {
                currentMockContest.standings = update.standings;
                return currentMockContest;
            }
            return currentMockContest;
        }),
        mockContestFindByIdAndDelete: vi.fn(),
        mockContestFindOneAndUpdate: vi.fn().mockImplementation(async (query: any, update: any) => {
            if (!currentMockContest) return null;
            if (update.$push && update.$push.standings) {
                currentMockContest.standings.push(update.$push.standings);
                return currentMockContest;
            }
            if (update.$set && update.$set['standings.$']) {
                const username = query['standings.username'];
                const idx = currentMockContest.standings.findIndex((s: any) => s.username === username);
                if (idx !== -1) {
                    currentMockContest.standings[idx] = update.$set['standings.$'];
                    return currentMockContest;
                }
            }
            return null;
        }),
        mockSubmissionFind: vi.fn(),
        mockSubmissionDistinct: vi.fn(),
        mockContestSave: vi.fn()
    };
});

// Mock Contest model - handles both direct findById and findById().populate() patterns
vi.mock('../mongoose/schemas/contests', () => {
    const ContestMock = function (data: any) {
        return {
            ...data,
            save: mockContestSave
        };
    };
    // Support both Contest.find(q).sort(...) and await Contest.find(q) patterns
    ContestMock.find = (query: any) => {
        const directPromise = mockContestFindDirect(query);
        return {
            sort: mockContestFind,
            then: (resolve: any, reject: any) => directPromise.then(resolve, reject),
            catch: (reject: any) => directPromise.catch(reject)
        };
    };
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
    ContestMock.findOneAndUpdate = mockContestFindOneAndUpdate;
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
    updateStandings,
    useGoldenMedal
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
    endTime: undefined as Date | undefined,
    submissionEndTime: new Date('2025-01-03T00:00:00Z'),
    problems: [{ serialNumber: 1, score: 100 }],
    released: true,
    canApplyGM: false,
    standings: [] as any[],
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
                user: { role: UserRole.JudgeAdmin } as any,
                body: {
                    title: 'New Contest',
                    description: 'Description',
                    startTime: new Date(),
                    submissionEndTime: new Date(),
                    problems: []
                }
            };

            await createContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });

        it('should create contest when TA', async () => {
            const savedContest = createMockContest();
            mockContestSave.mockResolvedValue(savedContest);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.TA } as any,
                body: {
                    title: 'New Contest',
                    description: 'Description',
                    startTime: new Date(),
                    submissionEndTime: new Date(),
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
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' },
                body: { title: 'Updated' }
            };

            await updateContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should update contest when TA', async () => {
            mockContestFindByIdAndUpdate.mockResolvedValue(createMockContest({ title: 'Updated' }));
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.TA } as any,
                params: { id: 'contest1' },
                body: { title: 'Updated' }
            };

            await updateContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if no ID provided', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
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
                user: { role: UserRole.JudgeAdmin } as any,
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
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await deleteContest(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });


        it('should return 404 if contest not found', async () => {
            mockContestFindByIdAndDelete.mockResolvedValue(null);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
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
            console.log('SENT STANDINGS:', sentStandings); expect(sentStandings[0].username).toBe('user3'); // 100 points, lower count
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

    describe('useGoldenMedal', () => {
        const END_TIME = new Date('2025-01-01T03:00:00Z');
        // Exactly 1 day (86400 s) after endTime; penalty factor = 1 - 1/5 = 0.8 → score 80
        const LATE_TIME = new Date(END_TIME.getTime() + 86400 * 1000);

        const makeStanding = (goldenMedalCount: number) => ({
            username: 'testuser',
            totalScore: 0,
            solvedCount: 0,
            goldenMedalCount,
            problemScores: [],
            submissionCount: 0
        });

        it('should return 400 if no ID provided', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: {},
                body: { count: 1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if count is missing', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: {}
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if count is negative', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: -1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if count exceeds budget of 8', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 9 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if contest not found', async () => {
            mockContestFindById.mockResolvedValue(null);
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
        });

        it('should return 400 if canApplyGM is false on the contest', async () => {
            mockContestFindById.mockResolvedValue(createMockContest({ canApplyGM: false }));
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if user has no standing in the contest', async () => {
            mockContestFindById.mockResolvedValue(createMockContest({ canApplyGM: true, standings: [] }));
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if total GM allocation across contests exceeds budget', async () => {
            // User already has 6 GMs in another contest; requesting 3 more would exceed 8
            const otherContest = createMockContest({
                _id: 'contest2',
                standings: [{ username: 'testuser', goldenMedalCount: 6 }]
            });
            mockContestFindDirect.mockResolvedValue([otherContest]);
            mockContestFindById.mockResolvedValue(
                createMockContest({ canApplyGM: true, standings: [makeStanding(0)] })
            );
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 3 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should apply 1 GM: 1-day delay cancelled, score stays 100', async () => {
            const contest = createMockContest({
                canApplyGM: true,
                endTime: END_TIME,
                standings: [makeStanding(0)]
            });
            setCurrentMockContest(contest);
            mockContestFindById.mockResolvedValue(contest);
            mockContestFindDirect.mockResolvedValue([]); // no GMs used elsewhere
            // 1 day late; with 1 GM delay becomes 0 → no penalty → score 100
            mockSubmissionFind.mockResolvedValue([
                { username: 'testuser', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: LATE_TIME }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const body = (mockResponse.send as any).mock.calls[0][0];
            expect(body.goldenMedalCount).toBe(1);
            expect(body.standing.goldenMedalCount).toBe(1);
            expect(body.standing.totalScore).toBeCloseTo(100);
        });

        it('should remove GMs (count=0): full 1-day penalty restored, score becomes 80', async () => {
            const contest = createMockContest({
                canApplyGM: true,
                endTime: END_TIME,
                standings: [makeStanding(1)] // had 1 GM applied
            });
            setCurrentMockContest(contest);
            mockContestFindById.mockResolvedValue(contest);
            mockContestFindDirect.mockResolvedValue([]);
            // 1 day late; without GM factor = 0.8 → score 80
            mockSubmissionFind.mockResolvedValue([
                { username: 'testuser', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: LATE_TIME }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 0 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const body = (mockResponse.send as any).mock.calls[0][0];
            expect(body.goldenMedalCount).toBe(0);
            expect(body.standing.goldenMedalCount).toBe(0);
            expect(body.standing.totalScore).toBeCloseTo(80);
        });

        it('should apply 2 GMs: 2-day delay reduced to 0 on a 2-day-late submission', async () => {
            const TWO_DAYS_LATE = new Date(END_TIME.getTime() + 2 * 86400 * 1000);
            const contest = createMockContest({
                canApplyGM: true,
                endTime: END_TIME,
                standings: [makeStanding(0)]
            });
            setCurrentMockContest(contest);
            mockContestFindById.mockResolvedValue(contest);
            mockContestFindDirect.mockResolvedValue([]);
            // 2 days late; with 2 GMs delay becomes 0 → no penalty → score 100
            mockSubmissionFind.mockResolvedValue([
                { username: 'testuser', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: TWO_DAYS_LATE }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 2 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const body = (mockResponse.send as any).mock.calls[0][0];
            expect(body.goldenMedalCount).toBe(2);
            expect(body.standing.totalScore).toBeCloseTo(100);
        });

        it('should allow distributing remaining budget across contests', async () => {
            // User has 5 GMs used in another contest; 3 remaining → count: 3 is valid
            const otherContest = createMockContest({
                _id: 'contest2',
                standings: [{ username: 'testuser', goldenMedalCount: 5 }]
            });
            mockContestFindDirect.mockResolvedValue([otherContest]);
            const contest = createMockContest({
                canApplyGM: true,
                endTime: END_TIME,
                standings: [makeStanding(0)]
            });
            setCurrentMockContest(contest);
            mockContestFindById.mockResolvedValue(contest);
            mockSubmissionFind.mockResolvedValue([]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 3 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const body = (mockResponse.send as any).mock.calls[0][0];
            expect(body.goldenMedalCount).toBe(3);
        });

        it('should handle 500 on database error', async () => {
            mockContestFindById.mockRejectedValue(new Error('DB error'));
            mockRequest = {
                isAuthenticated: () => true,
                user: { username: 'testuser', role: UserRole.Student } as any,
                params: { id: 'contest1' },
                body: { count: 1 }
            };

            await useGoldenMedal(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    describe('late penalty calculation (via updateStandings)', () => {
        const END_TIME = new Date('2025-01-01T03:00:00Z');

        it('should apply no penalty for submissions before endTime', async () => {
            const contestToUpdate = createMockContest({
                endTime: END_TIME,
                standings: []
            });
            setCurrentMockContest(contestToUpdate);
            mockContestFindById.mockResolvedValue(contestToUpdate);
            mockSubmissionDistinct.mockResolvedValue(['user1']);
            mockSubmissionFind.mockResolvedValue([
                { username: 'user1', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: new Date('2025-01-01T02:00:00Z') }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            const standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(standing?.totalScore).toBe(100);
        });

        it('should apply penalty proportional to seconds late (1 day late → 80%)', async () => {
            // 1 day = 86400 s late; factor = 1 - 86400 / (5 * 86400) = 0.8
            const LATE_TIME = new Date(END_TIME.getTime() + 86400 * 1000);
            const contestToUpdate = createMockContest({
                endTime: END_TIME,
                standings: []
            });
            setCurrentMockContest(contestToUpdate);
            mockContestFindById.mockResolvedValue(contestToUpdate);
            mockSubmissionDistinct.mockResolvedValue(['user1']);
            mockSubmissionFind.mockResolvedValue([
                { username: 'user1', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: LATE_TIME }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            const standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(standing?.totalScore).toBeCloseTo(80);
        });

        it('should pick best effective score across multiple late submissions', async () => {
            // sub1: 2.5 days late → factor = 1 - 0.5 = 0.5 → 60 * 0.5 = 30
            // sub2: 1 day late   → factor = 0.8            → 80 * 0.8 = 64  ← best
            const sub1Time = new Date(END_TIME.getTime() + 2.5 * 86400 * 1000);
            const sub2Time = new Date(END_TIME.getTime() + 1 * 86400 * 1000);
            const contestToUpdate = createMockContest({
                endTime: END_TIME,
                standings: []
            });
            setCurrentMockContest(contestToUpdate);
            mockContestFindById.mockResolvedValue(contestToUpdate);
            mockSubmissionDistinct.mockResolvedValue(['user1']);
            mockSubmissionFind.mockResolvedValue([
                { username: 'user1', problemSerialNumber: 1, score: 80, status: SubmissionStatus.AC, createdAt: sub2Time },
                { username: 'user1', problemSerialNumber: 1, score: 60, status: SubmissionStatus.AC, createdAt: sub1Time }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            const standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(standing?.totalScore).toBeCloseTo(64);
        });

        it('should apply penalty for a submission half a day (43200 s) late (factor 0.9)', async () => {
            // 0.5 days = 43200 s late; factor = 1 - 43200 / (5 * 86400) = 1 - 0.1 = 0.9 → score 90
            const HALF_DAY_LATE = new Date(END_TIME.getTime() + 0.5 * 86400 * 1000);
            const contestToUpdate = createMockContest({
                endTime: END_TIME,
                standings: []
            });
            setCurrentMockContest(contestToUpdate);
            mockContestFindById.mockResolvedValue(contestToUpdate);
            mockSubmissionDistinct.mockResolvedValue(['user1']);
            mockSubmissionFind.mockResolvedValue([
                { username: 'user1', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: HALF_DAY_LATE }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            const standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(standing?.totalScore).toBeCloseTo(90);
        });

        it('should cap effective score at 0 for submissions 5+ days late', async () => {
            // 6 days late → factor = 1 - 6/5 = -0.2 → capped at 0
            const VERY_LATE_TIME = new Date(END_TIME.getTime() + 6 * 86400 * 1000);
            const contestToUpdate = createMockContest({
                endTime: END_TIME,
                standings: []
            });
            setCurrentMockContest(contestToUpdate);
            mockContestFindById.mockResolvedValue(contestToUpdate);
            mockSubmissionDistinct.mockResolvedValue(['user1']);
            mockSubmissionFind.mockResolvedValue([
                { username: 'user1', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: VERY_LATE_TIME }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            const standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(standing?.totalScore).toBe(0);
        });

        it('should apply no late penalty when contest has no endTime', async () => {
            // Without endTime there is no late boundary → full score regardless of submission time
            const FAR_FUTURE = new Date('2099-01-01T00:00:00Z');
            const contestToUpdate = createMockContest({
                endTime: undefined,
                standings: []
            });
            setCurrentMockContest(contestToUpdate);
            mockContestFindById.mockResolvedValue(contestToUpdate);
            mockSubmissionDistinct.mockResolvedValue(['user1']);
            mockSubmissionFind.mockResolvedValue([
                { username: 'user1', problemSerialNumber: 1, score: 100, status: SubmissionStatus.AC, createdAt: FAR_FUTURE }
            ]);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            const standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(standing?.totalScore).toBe(100);
        });
    });

    describe('updateStandings', () => {

        it('should return 400 if no ID provided', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
                params: {}
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if contest not found', async () => {
            mockContestFindById.mockResolvedValue(null);
            mockRequest = {
                isAuthenticated: () => true,
                user: { role: UserRole.JudgeAdmin } as any,
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
            setCurrentMockContest(contestToUpdate);
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
                user: { role: UserRole.JudgeAdmin } as any,
                params: { id: 'contest1' }
            };

            await updateStandings(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);

            // Verify standings were calculated
            // We can't verify length easily if logic creates new array, but mock object is modified in place in util?
            // "contest.standings = []" inside recalculateContestStandings logic clears it.
            // But verify calls happened.
            expect(mockSubmissionDistinct).toHaveBeenCalled();

            // user1 should have score 80 (best attempt)
             const user1Standing = contestToUpdate.standings.find((s: any) => s.username === 'user1');
            expect(user1Standing?.totalScore).toBe(80);

            // user2 should have score 100
            const user2Standing = contestToUpdate.standings.find((s: any) => s.username === 'user2');
            expect(user2Standing?.totalScore).toBe(100);
        });
    });
});
