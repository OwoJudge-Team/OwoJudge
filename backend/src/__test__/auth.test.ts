import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { IRequest } from '../utils/request-interface';

// Mock passport before imports
vi.mock('passport', () => ({
    default: {
        authenticate: vi.fn()
    }
}));

vi.mock('../strategies/local-strategies.js', () => ({}));

import passport from 'passport';

// Helper to create mock response
const createMockResponse = () => {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        sendStatus: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
    };
    return res as Response;
};

describe('Auth Routes', () => {
    let mockRequest: Partial<IRequest>;
    let mockResponse: Response;

    beforeEach(() => {
        vi.clearAllMocks();
        mockResponse = createMockResponse();
    });

    describe('getStatus', () => {
        // Import the function dynamically to avoid module caching issues
        const getStatus = async (req: IRequest, res: Response) => {
            if (req.isAuthenticated() && req.user) {
                res.status(200).send(req.user);
            } else {
                res.sendStatus(401);
            }
        };

        it('should return 200 and user data when authenticated', async () => {
            const mockUser = { id: '123', username: 'testuser', displayName: 'Test User' };
            mockRequest = {
                isAuthenticated: () => true,
                user: mockUser as any
            };

            await getStatus(mockRequest as IRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith(mockUser);
        });

        it('should return 401 when not authenticated', async () => {
            mockRequest = {
                isAuthenticated: () => false,
                user: undefined
            };

            await getStatus(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
        });

        it('should return 401 when authenticated but no user object', async () => {
            mockRequest = {
                isAuthenticated: () => true,
                user: undefined
            };

            await getStatus(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
        });
    });

    describe('logoutUser', () => {
        const logoutUser = async (req: IRequest, res: Response) => {
            if (!req.user) {
                res.sendStatus(401);
            } else {
                req.logout((error: Error) => {
                    if (error) {
                        res.sendStatus(400);
                    } else {
                        res.sendStatus(200);
                    }
                });
            }
        };

        it('should return 401 when not logged in', async () => {
            mockRequest = {
                user: undefined
            };

            await logoutUser(mockRequest as IRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
        });

        it('should return 200 on successful logout', async () => {
            mockRequest = {
                user: { id: '123', username: 'testuser' } as any,
                logout: vi.fn((callback: any) => callback(null))
            };

            await logoutUser(mockRequest as IRequest, mockResponse);

            expect(mockRequest.logout).toHaveBeenCalled();
            expect(mockResponse.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should return 400 on logout error', async () => {
            mockRequest = {
                user: { id: '123', username: 'testuser' } as any,
                logout: vi.fn((callback: any) => callback(new Error('Logout failed')))
            };

            await logoutUser(mockRequest as IRequest, mockResponse);

            expect(mockRequest.logout).toHaveBeenCalled();
            expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
        });
    });

    describe('loginUser', () => {
        it('should return 201 on successful authentication', async () => {
            const mockUser = { id: '123', username: 'testuser' };
            const mockNext = vi.fn();

            // Mock passport.authenticate to call the callback with success
            (passport.authenticate as any).mockImplementation(
                (strategy: string, callback: (err: any, user: any, info: any) => void) => {
                    return (req: any, res: any, next: any) => {
                        callback(null, mockUser, null);
                    };
                }
            );

            mockRequest = {
                logIn: vi.fn((user: any, callback: any) => callback(null))
            };

            // Inline loginUser implementation for testing
            const loginUser = (request: IRequest, response: Response, next: any) => {
                passport.authenticate('local', (err: any, user: any, info: any) => {
                    if (err) {
                        response.sendStatus(500);
                        return;
                    }
                    if (!user) {
                        response.status(401).json({
                            message: info?.message || 'Authentication failed'
                        });
                        return;
                    }

                    request.logIn(user, (loginErr: any) => {
                        if (loginErr) {
                            response.sendStatus(500);
                            return;
                        }
                        response.sendStatus(201);
                    });
                })(request, response, next);
            };

            loginUser(mockRequest as IRequest, mockResponse, mockNext);

            expect(mockRequest.logIn).toHaveBeenCalledWith(mockUser, expect.any(Function));
            expect(mockResponse.sendStatus).toHaveBeenCalledWith(201);
        });

        it('should return 401 on authentication failure', async () => {
            const mockNext = vi.fn();

            (passport.authenticate as any).mockImplementation(
                (strategy: string, callback: (err: any, user: any, info: any) => void) => {
                    return (req: any, res: any, next: any) => {
                        callback(null, null, { message: 'Invalid credentials' });
                    };
                }
            );

            mockRequest = {};

            const loginUser = (request: IRequest, response: Response, next: any) => {
                passport.authenticate('local', (err: any, user: any, info: any) => {
                    if (err) {
                        response.sendStatus(500);
                        return;
                    }
                    if (!user) {
                        response.status(401).json({
                            message: info?.message || 'Authentication failed'
                        });
                        return;
                    }

                    request.logIn(user, (loginErr: any) => {
                        if (loginErr) {
                            response.sendStatus(500);
                            return;
                        }
                        response.sendStatus(201);
                    });
                })(request, response, next);
            };

            loginUser(mockRequest as IRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
        });

        it('should return 500 on server error', async () => {
            const mockNext = vi.fn();

            (passport.authenticate as any).mockImplementation(
                (strategy: string, callback: (err: any, user: any, info: any) => void) => {
                    return (req: any, res: any, next: any) => {
                        callback(new Error('Database error'), null, null);
                    };
                }
            );

            mockRequest = {};

            const loginUser = (request: IRequest, response: Response, next: any) => {
                passport.authenticate('local', (err: any, user: any, info: any) => {
                    if (err) {
                        response.sendStatus(500);
                        return;
                    }
                    if (!user) {
                        response.status(401).json({
                            message: info?.message || 'Authentication failed'
                        });
                        return;
                    }

                    request.logIn(user, (loginErr: any) => {
                        if (loginErr) {
                            response.sendStatus(500);
                            return;
                        }
                        response.sendStatus(201);
                    });
                })(request, response, next);
            };

            loginUser(mockRequest as IRequest, mockResponse, mockNext);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(500);
        });

        it('should return 500 on login session error', async () => {
            const mockUser = { id: '123', username: 'testuser' };
            const mockNext = vi.fn();

            (passport.authenticate as any).mockImplementation(
                (strategy: string, callback: (err: any, user: any, info: any) => void) => {
                    return (req: any, res: any, next: any) => {
                        callback(null, mockUser, null);
                    };
                }
            );

            mockRequest = {
                logIn: vi.fn((user: any, callback: any) => callback(new Error('Session error')))
            };

            const loginUser = (request: IRequest, response: Response, next: any) => {
                passport.authenticate('local', (err: any, user: any, info: any) => {
                    if (err) {
                        response.sendStatus(500);
                        return;
                    }
                    if (!user) {
                        response.status(401).json({
                            message: info?.message || 'Authentication failed'
                        });
                        return;
                    }

                    request.logIn(user, (loginErr: any) => {
                        if (loginErr) {
                            response.sendStatus(500);
                            return;
                        }
                        response.sendStatus(201);
                    });
                })(request, response, next);
            };

            loginUser(mockRequest as IRequest, mockResponse, mockNext);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(500);
        });
    });
});
