import { Router, Request, Response } from 'express';
import passport from 'passport';
import '../strategies/local-strategies.js';
import { IRequest } from '../utils/request-interface.js';

const authRouter: Router = Router();

const authenticateUser = (request: IRequest, response: Response) => {
  response.sendStatus(201);
};

const loginUser = (request: IRequest, response: Response, next: any) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      // Server error (database issues, etc.)
      response.sendStatus(500);
      return;
    }
    if (!user) {
      // Authentication failed (wrong username/password)
      response.status(401).json({ 
        message: info?.message || 'Authentication failed' 
      });
      return;
    }
    
    // Login the user
    request.logIn(user, (loginErr: any) => {
      if (loginErr) {
        response.sendStatus(500);
        return;
      }
      response.sendStatus(201);
    });
  })(request, response, next);
};

const getStatus = (request: IRequest, response: Response) => {
  if (request.isAuthenticated() && request.user) {
    response.status(200).send(request.user);
  } else {
    response.sendStatus(401);
  }
};

const logoutUser = (request: IRequest, response: Response) => {
  if (!request.user) {
    response.sendStatus(401);
  } else {
    request.logout((error: Error) => {
      if (error) {
        response.sendStatus(400);
      } else {
        response.sendStatus(200);
      }
    });
  }
};

authRouter.post('/api/auth', loginUser);
authRouter.get('/api/auth/status', getStatus);
authRouter.post('/api/auth/logout', logoutUser);

export default authRouter;
