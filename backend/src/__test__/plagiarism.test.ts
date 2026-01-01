import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlagiarismReport } from '../routes/problems';
import { DolosManager } from '../utils/dolos-manager';
import { IRequest } from '../utils/request-interface';
import { Response } from 'express';

// Mock DolosManager
vi.mock('../utils/dolos-manager', () => {
  return {
    DolosManager: {
      checkPlagiarism: vi.fn()
    }
  };
});

describe('getPlagiarismReport', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let sendMock: any;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    sendMock = vi.fn();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ send: sendMock, json: jsonMock });
    mockResponse = {
      status: statusMock,
      sendStatus: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockRequest = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      user: undefined
    };

    await getPlagiarismReport(mockRequest as IRequest, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith('Please login first');
  });

  it('should return 403 if user is not admin', async () => {
    mockRequest = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      user: { isAdmin: false }
    };

    await getPlagiarismReport(mockRequest as IRequest, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(sendMock).toHaveBeenCalledWith('You are not authorized to view plagiarism reports');
  });

  it('should return 400 if serialNumber is invalid', async () => {
    mockRequest = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      user: { isAdmin: true },
      params: { serialNumber: 'invalid' }
    };

    await getPlagiarismReport(mockRequest as IRequest, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(sendMock).toHaveBeenCalledWith('Invalid problem ID');
  });

  it('should return 404 if DolosManager returns null', async () => {
    mockRequest = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      user: { isAdmin: true },
      params: { serialNumber: '1' }
    };

    vi.mocked(DolosManager.checkPlagiarism).mockResolvedValue(null);

    await getPlagiarismReport(mockRequest as IRequest, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(sendMock).toHaveBeenCalledWith('No submissions found or analysis failed');
  });

  it('should return 200 with result if DolosManager returns data', async () => {
    mockRequest = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      user: { isAdmin: true },
      params: { serialNumber: '1' }
    };

    const mockResult = { pairs: [], graph: {} };
    vi.mocked(DolosManager.checkPlagiarism).mockResolvedValue(mockResult);

    await getPlagiarismReport(mockRequest as IRequest, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(mockResult);
  });

  it('should return 500 if DolosManager throws error', async () => {
    mockRequest = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      user: { isAdmin: true },
      params: { serialNumber: '1' }
    };

    vi.mocked(DolosManager.checkPlagiarism).mockRejectedValue(new Error('Dolos failed'));

    await getPlagiarismReport(mockRequest as IRequest, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(sendMock).toHaveBeenCalledWith('Internal Server Error');
  });
});
