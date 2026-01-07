import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isJudgeAdmin, isTA, isAuthenticated } from '../../middleware/auth';
import { IRequest } from '../../utils/request-interface';
import { Response, NextFunction } from 'express';
import { UserRole } from '../../mongoose/schemas/users';

describe('Auth Middleware', () => {
    let req: Partial<IRequest>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            isAuthenticated: vi.fn(),
            user: undefined
        };
        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        };
        next = vi.fn();
    });

    describe('isAuthenticated', () => {
        it('should call next if user is authenticated', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { username: 'test' } as any;

            isAuthenticated(req as IRequest, res as Response, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 401 if user is not authenticated', () => {
            (req.isAuthenticated as any).mockReturnValue(false);

            isAuthenticated(req as IRequest, res as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith('Please login first');
        });

        it('should return 401 if req.user is missing', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = undefined;

            isAuthenticated(req as IRequest, res as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('isJudgeAdmin', () => {
        it('should call next if user is judge admin', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { role: UserRole.JudgeAdmin } as any;

            isJudgeAdmin(req as IRequest, res as Response, next);

            expect(next).toHaveBeenCalled();
        });

        it('should return 401 if not authenticated', () => {
            (req.isAuthenticated as any).mockReturnValue(false);

            isJudgeAdmin(req as IRequest, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 403 if user is not admin', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { role: UserRole.Student } as any;

            isJudgeAdmin(req as IRequest, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith('Please login as a Judge Admin first');
        });
        
         it('should return 403 if user is TA', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { role: UserRole.TA } as any;

            isJudgeAdmin(req as IRequest, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('isTA', () => {
        it('should call next if user is TA', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { role: UserRole.TA } as any;

            isTA(req as IRequest, res as Response, next);

            expect(next).toHaveBeenCalled();
        });

        it('should call next if user is JudgeAdmin', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { role: UserRole.JudgeAdmin } as any;

            isTA(req as IRequest, res as Response, next);

            expect(next).toHaveBeenCalled();
        });

        it('should return 401 if not authenticated', () => {
            (req.isAuthenticated as any).mockReturnValue(false);

            isTA(req as IRequest, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 403 if user is Student', () => {
            (req.isAuthenticated as any).mockReturnValue(true);
            req.user = { role: UserRole.Student } as any;

            isTA(req as IRequest, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith('Please login as a TA or Judge Admin first');
        });
    });
});