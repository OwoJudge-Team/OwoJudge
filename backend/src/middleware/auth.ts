import { Response, NextFunction } from 'express';
import { IRequest } from '../utils/request-interface';
import { IUser } from '../mongoose/schemas/users';

export const isAdmin = (request: IRequest, response: Response, next: NextFunction): void => {
    if (!request.isAuthenticated() || !request.user) {
        response.status(401).send('Please login first');
        return;
    }

    const user = request.user as IUser;
    if (!user.isAdmin) {
        response.status(403).send('Please login as an admin first');
        return;
    }

    next();
};

export const isAuthenticated = (request: IRequest, response: Response, next: NextFunction): void => {
    if (!request.isAuthenticated() || !request.user) {
        response.status(401).send('Please login first');
        return;
    }
    next();
};
