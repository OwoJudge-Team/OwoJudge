import { Response, NextFunction } from 'express';
import { IRequest } from '../utils/request-interface';
import { IUser, UserRole } from '../mongoose/schemas/users';

export const isJudgeAdmin = (request: IRequest, response: Response, next: NextFunction): void => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }

  const user = request.user as IUser;
  if (user.role !== UserRole.JudgeAdmin) {
    response.status(403).send('Please login as a Judge Admin first');
    return;
  }

  next();
};

export const isTA = (request: IRequest, response: Response, next: NextFunction): void => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }

  const user = request.user as IUser;
  if (user.role !== UserRole.TA && user.role !== UserRole.JudgeAdmin) {
    response.status(403).send('Please login as a TA or Judge Admin first');
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
