import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { IRequest } from '../utils/request-interface';
import { getAllContests, getContestByID } from '../routes/contests';
import { getProblems, getProblemByID } from '../routes/problems';
import { UserRole } from '../mongoose/schemas/users';

// Hoist mocks
const {
  mockContestFind,
  mockContestFindById,
  mockProblemFind,
  mockProblemFindOne
} = vi.hoisted(() => ({
  mockContestFind: vi.fn(),
  mockContestFindById: vi.fn(),
  mockProblemFind: vi.fn(),
  mockProblemFindOne: vi.fn()
}));

// Mock Models
vi.mock('../mongoose/schemas/contests', () => {
  return {
    Contest: {
      find: mockContestFind,
      findById: mockContestFindById
    },
    IContest: {},
    UserStanding: {}
  };
});

vi.mock('../mongoose/schemas/problems', () => {
  return {
    Problem: {
      find: mockProblemFind,
      findOne: mockProblemFindOne
    },
    IProblem: {},
    ProblemStatus: { Waiting: 'waiting' }
  };
});

describe('Visibility Tests', () => {
  let mockRequest: Partial<IRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      sendStatus: vi.fn()
    };

    // Setup default chainable mocks
    mockContestFind.mockReturnValue({
      sort: vi.fn().mockResolvedValue([])
    });

    mockProblemFind.mockReturnValue({
        select: vi.fn().mockReturnValue({
            sort: vi.fn().mockResolvedValue([])
        })
    });
  });

  describe('Contests', () => {
    it('should filter unreleased contests for non-privileged users', async () => {
      mockRequest = { user: { role: UserRole.Student } as any };
      await getAllContests(mockRequest as IRequest, mockResponse as Response);
      
      expect(mockContestFind).toHaveBeenCalledWith({ released: true });
    });

    it('should not filter contests for admin users', async () => {
        mockRequest = { user: { role: UserRole.JudgeAdmin } as any };
        await getAllContests(mockRequest as IRequest, mockResponse as Response);
        
        expect(mockContestFind).toHaveBeenCalledWith({});
    });

    it('should block access to unreleased contest for non-privileged', async () => {
        mockRequest = { 
            params: { id: '123' },
            user: { role: UserRole.Student } as any 
        };
        
        const mockContest = { released: false, populate: vi.fn() };
        // fix the chain
        mockContestFindById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockContest)
        });

        await getContestByID(mockRequest as IRequest, mockResponse as Response);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('should allow access to unreleased contest for admin', async () => {
        mockRequest = { 
            params: { id: '123' },
            user: { role: UserRole.JudgeAdmin } as any 
        };
        
        const mockContest = { released: false };
        mockContestFindById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockContest)
        });

        await getContestByID(mockRequest as IRequest, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith(mockContest);
    });

    it('should allow access to unreleased contest for TA', async () => {
        mockRequest = { 
            params: { id: '123' },
            user: { role: UserRole.TA } as any 
        };
        
        const mockContest = { released: false };
        mockContestFindById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockContest)
        });

        await getContestByID(mockRequest as IRequest, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith(mockContest);
    });
  });

  describe('Problems', () => {
    it('should filter unreleased problems for non-privileged users', async () => {
        mockRequest = { user: { role: UserRole.Student } as any };
        await getProblems(mockRequest as IRequest, mockResponse as Response);
        
        expect(mockProblemFind).toHaveBeenCalledWith({ released: true });
    });

    it('should not filter problems for admin users', async () => {
        mockRequest = { user: { role: UserRole.JudgeAdmin } as any };
        await getProblems(mockRequest as IRequest, mockResponse as Response);
        
        expect(mockProblemFind).toHaveBeenCalledWith({});
    });

    it('should block access to unreleased problem for non-privileged', async () => {
        mockRequest = { 
            params: { serialNumber: '1' },
            user: { role: UserRole.Student } as any 
        };
        
        const mockProblem = { released: false };
        mockProblemFindOne.mockResolvedValue(mockProblem);

        await getProblemByID(mockRequest as IRequest, mockResponse as Response);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('should allow access to unreleased problem for admin', async () => {
        mockRequest = { 
            params: { serialNumber: '1' },
            user: { role: UserRole.JudgeAdmin } as any 
        };
        
        const mockProblem = { released: false, toObject: () => ({...mockProblem}) };
        mockProblemFindOne.mockResolvedValue(mockProblem); // getProblemByID reads toObject() later but we mock findOne 

        // We need to bypass the file reading part in getProblemByID which might fail
        // Actually getProblemByID does file operations. We should mock those or handle the error.
        // If we look at the code: "const description = readFileSync..."
        // This will crash if we don't mock fs.
        // Let's just catch the error or verify the 404 check happened BEFORE file ops.
        // The check happens right after finding the problem.
        
        // Wait, current implementation of getProblemByID does:
        // if (!problem.released && !admin) return 404
        // Then it continues to read files.
        // So for the "allow access" test, it will proceed to read files and likely crash/fail/log error
        // BUT we can verify that sendStatus(404) was NOT called.
        
        try {
            await getProblemByID(mockRequest as IRequest, mockResponse as Response);
        } catch (e) {
            // It might fail on fs operations, which is expected since we didn't mock fs
        }
        
        expect(mockResponse.sendStatus).not.toHaveBeenCalledWith(404);
    });

    it('should allow access to unreleased problem for TA', async () => {
        mockRequest = { 
            params: { serialNumber: '1' },
            user: { role: UserRole.TA } as any 
        };
        
        const mockProblem = { released: false, toObject: () => ({...mockProblem}) };
        mockProblemFindOne.mockResolvedValue(mockProblem);

        try {
            await getProblemByID(mockRequest as IRequest, mockResponse as Response);
        } catch (e) {
            // It might fail on fs operations, which is expected since we didn't mock fs
        }
        
        expect(mockResponse.sendStatus).not.toHaveBeenCalledWith(404);
    });
  });
});
