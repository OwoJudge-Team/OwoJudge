/**
 * Authentication routes.
 *
 * Authentication is handled via session cookies. Most endpoints require a user to be logged in.
 *
 * @module Auth
 */

import { Router, Response } from 'express';
import passport from 'passport';
import '../strategies/local-strategies.js';
import { IRequest } from '../utils/request-interface.js';

const authRouter: Router = Router();

/**
 * Authenticates a user and starts a session.
 *
 * @route `POST /api/auth`
 *
 * @internal
 * 
 * @param request - Express request. Body must contain:
 *   - `username` (string)
 *   - `password` (string)
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` on successful authentication.
 * - `401 Unauthorized` if credentials are invalid.
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "username": "your-username",
 *   "password": "your-password"
 * }
 * ```
 */
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

/**
 * Checks if the current user is authenticated.
 *
 * @route `GET /api/auth/status`
 * 
 * @internal
 *
 * @param request - Express request with session cookie.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the user object if authenticated.
 * - `401 Unauthorized` if the user is not authenticated.
 */
const getStatus = (request: IRequest, response: Response) => {
  if (request.isAuthenticated() && request.user) {
    response.status(200).send(request.user);
  } else {
    response.sendStatus(401);
  }
};

/**
 * Logs out the currently authenticated user and destroys the session.
 *
 * @route `POST /api/auth/logout`
 * 
 * @internal
 *
 * @param request - Express request with session cookie.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` on successful logout.
 * - `401 Unauthorized` if no user is logged in.
 */
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
export {
  loginUser,
  getStatus,
  logoutUser,
}