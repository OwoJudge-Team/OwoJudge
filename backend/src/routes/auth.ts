import { Router, Request, Response } from 'express';
import passport from 'passport';
import '../strategies/local-strategies.js';

const authRouter: Router = Router();

const authenticateUser = (request: Request, response: Response) => {
  response.sendStatus(201);
};

const getStatus = (request: Request, response: Response) => {
  if (request.user) {
    response.status(200).send(request.user);
  } else {
    response.sendStatus(401);
  }
};

const logoutUser = (request: Request, response: Response) => {
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

authRouter.post('/api/auth', passport.authenticate('local'), authenticateUser);
authRouter.get('/api/auth/status', getStatus);
authRouter.post('/api/auth/logout', logoutUser);

export default authRouter;
