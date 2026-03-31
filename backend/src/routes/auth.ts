/**
 * Authentication routes.
 *
 * Authentication is handled via session cookies. Most endpoints require a user to be logged in.
 *
 * @module API/Auth
 */

import { Router, Response, Request } from 'express';
import passport from 'passport';
import crypto from 'crypto';
import '../strategies/local-strategies.js';
import { IRequest } from '../utils/request-interface.js';
import { User } from '../mongoose/schemas/users.js';
import { hashString } from '../utils/hash-password.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

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

/**
 * Sends a password reset link to the email address associated with a username.
 *
 * @route `POST /api/auth/forgot-password`
 *
 * @param request - Express request. Body must contain:
 *   - `username` (string)
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` always (to avoid username enumeration).
 * - `500 Internal Server Error` if the email fails to send.
 *
 * @example
 * ##### Request Body
 * ```json
 * { "username": "alice" }
 * ```
 */
const forgotPassword = async (request: Request, response: Response): Promise<void> => {
  const { username } = request.body;

  if (!username || typeof username !== 'string') {
    response.status(400).json({ message: 'username is required' });
    return;
  }

  try {
    const user = await User.findOne({ username });

    // Always respond 200 to avoid username enumeration
    if (!user) {
      response.sendStatus(200);
      return;
    }

    // Derive email from username + domain, falling back to the stored email field
    const emailDomain = process.env.USER_EMAIL_DOMAIN;
    const email = emailDomain ? `${username}@${emailDomain}` : user.email;

    if (!email) {
      response.status(500).json({ message: 'No email configured for this user' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.BACKEND_PORT || 8787}`;
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(email, resetUrl);

    response.sendStatus(200);
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    response.status(500).json({ message: 'Failed to send reset email' });
  }
};

/**
 * Resets a user's password using a valid reset token.
 *
 * @route `POST /api/auth/reset-password/:token`
 *
 * @param request - Express request. URL param `token`, body must contain:
 *   - `newPassword` (string, min 8 characters)
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` on success.
 * - `400 Bad Request` if the token is invalid, expired, or password too short.
 *
 * @example
 * ##### Request Body
 * ```json
 * { "newPassword": "newSecurePassword123" }
 * ```
 */
const resetPassword = async (request: Request, response: Response): Promise<void> => {
  const { token } = request.params;
  const { newPassword } = request.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    response.status(400).json({ message: 'newPassword must be at least 8 characters' });
    return;
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      response.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    await User.findByIdAndUpdate(user._id, {
      password: hashString(newPassword),
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });

    response.sendStatus(200);
  } catch (error) {
    console.error('[reset-password] Error:', error);
    response.sendStatus(500);
  }
};

authRouter.post('/api/auth', loginUser);
authRouter.get('/api/auth/status', getStatus);
authRouter.post('/api/auth/logout', logoutUser);
authRouter.post('/api/auth/forgot-password', forgotPassword);
authRouter.post('/api/auth/reset-password/:token', resetPassword);

export default authRouter;
export {
  loginUser,
  getStatus,
  logoutUser,
  forgotPassword,
  resetPassword,
}