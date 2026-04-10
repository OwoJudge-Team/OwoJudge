/**
 * User management routes.
 *
 * Endpoints for creating, reading, updating, and deleting user accounts.
 *
 * @module API/Users
 */

import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { User, IUser, UserRole } from '../mongoose/schemas/users';
import { createUserValidation } from '../validations/create-user-validation';
import { hashString } from '../utils/hash-password';
import { getUsersValidation } from '../validations/get-user-validation';
import { updateUserValidation } from '../validations/update-user-validation';
import { IRequest } from '../utils/request-interface';
import { giteaService } from '../utils/gitea-service';
import { isJudgeAdmin, isAuthenticated } from '../middleware/auth';
import { usernameParamValidation } from '../validations/username-param-validation';

const usersRouter = Router();

/**
 * Retrieves a list of all users, optionally filtered by a field.
 *
 * @route `GET /api/users`
 *
 * @param request - Express request. Accepts optional query parameters `filter` and `value` for
 *   case-insensitive regex filtering on user fields (e.g. `username`, `displayName`).
 *   Without filters, returns `id`, `username`, and `displayName` for all users.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with an array of user objects.
 * - `400 Bad Request` on validation or query error.
 * - `500 Internal Server Error` on database error.
 *
 * @example
 * ##### Response Body (no filter)
 * ```json
 * [
 *   {
 *     "_id": "68fb6d6e6deaffa916ced917",
 *     "username": "admin",
 *     "displayName": "Admin User"
 *   },
 *   {
 *     "_id": "68fb6d6e6deaffa916ced918",
 *     "username": "student1",
 *     "displayName": "Student One"
 *   }
 * ]
 * ```
 *
 * ##### Response Body (with filter)
 * ```json
 * [
 *   {
 *     "username": "admin",
 *     "displayName": "Admin User",
 *     "rating": 1500
 *   }
 * ]
 * ```
 */
const getAllUsers = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { filter, value } = matchedData(request);

  if (!filter && !value) {
    try {
      const users: IUser[] = await User.find().select('id username displayName').sort({ id: -1 });
      response.status(200).send(users);
    } catch (error) {
      console.error(error);
      response.status(500).send(error);
    }
    return;
  }

  try {
    const users: IUser[] = await User.find()
      .where(filter as string)
      .equals({ $regex: `.*${value}.*`, $options: 'i' })
      .select('username displayName rating');
    response.status(200).send(users);
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};

/**
 * Retrieves a specific user by their username.
 *
 * @route `GET /api/users/:username`
 * @authentication Required.
 *
 * @param request - Express request with `username` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the user object (password excluded).
 * - `404 Not Found` if the user does not exist.
 *
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb6d6e6deaffa916ced917",
 *   "username": "admin",
 *   "displayName": "Admin User",
 *   "role": "JudgeAdmin",
 *   "rating": 1500,
 *   "solvedProblems": [0, 1, 3],
 *   "giteaId": 1,
 *   "gitSshUrl": "git@localhost:admin/owojudge-solutions.git",
 *   "createdAt": "2025-10-24T13:00:00.000Z"
 * }
 * ```
 */
const getUserByUsername = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { username } = matchedData(request);
  try {
    const user: IUser | null = await User.findOne({ username }).select('-password');
    if (!user) {
      response.sendStatus(404);
      return;
    }

    if (user.solvedProblems && Array.isArray(user.solvedProblems)) {
      user.solvedProblems.sort((a, b) => Number(a) - Number(b));
    }

    response.status(200).send(user);
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};

/**
 * Creates a new user account and a corresponding Gitea user and repository.
 *
 * @route `POST /api/users`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request. Body must contain `username`, `password`,
 *   `displayName`, and optionally `role` (defaults to `Student`) and `studentId`.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` with the new user object (including Gitea data).
 * - `400 Bad Request` if validation fails.
 * - `500 Internal Server Error` if Gitea integration fails (user creation is rolled back).
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "username": "student1",
 *   "password": "securePassword123",
 *   "displayName": "Student One",
 *   "role": "Student",
 *   "studentId": "B12345678"
 * }
 * ```
 *
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb6d6e6deaffa916ced920",
 *   "username": "student1",
 *   "displayName": "Student One",
 *   "role": "Student",
 *   "studentId": "B12345678",
 *   "giteaId": 5,
 *   "gitSshUrl": "git@localhost:student1/owojudge-solutions.git",
 *   "createdAt": "2025-10-24T13:00:00.000Z"
 * }
 * ```
 */
const createUser = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { username, password, displayName, role, studentId } = matchedData(request) as IUser;

  try {
    // Step 1: Create OwoJudge user first (without Gitea data)
    const newUser = new User({
      username,
      displayName,
      role: role || UserRole.Student,
      studentId,
      password: hashString(password)
      // giteaId and gitSshUrl will be filled in later
    });

    const savedUser: IUser = await newUser.save();

    // Step 2: Create Gitea user and repo
    let giteaId: number;
    let gitSshUrl: string;

    try {
      const giteaUser = await giteaService.createUser({
        username,
        password,
        email: `${username}@owojudge.local`
      });
      giteaId = giteaUser.id;

      const giteaRepo = await giteaService.createUserRepo({ username });
      gitSshUrl = giteaRepo.ssh_url;
    } catch (giteaError) {
      console.error(`Failed to create Gitea user/repo for ${username}:`, giteaError);

      // Rollback: Delete judge user since Gitea integration failed
      try {
        await User.findOneAndDelete({ username });
      } catch (deleteError) {
        console.error(`Failed to rollback judge user ${username}:`, deleteError);
      }

      response.status(500).send({
        message: 'Failed to create Gitea user',
        error: giteaError
      });
      return;
    }

    // Step 3: Update judge user with Gitea data
    savedUser.giteaId = giteaId;
    savedUser.gitSshUrl = gitSshUrl;
    await savedUser.save();

    response.status(201).send(savedUser);
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
};

/**
 * Deletes a user account and the corresponding Gitea user.
 *
 * @route `DELETE /api/users/:username`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request with `username` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the deleted user object.
 * - `404 Not Found` if the user does not exist.
 *
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb6d6e6deaffa916ced920",
 *   "username": "student1",
 *   "displayName": "Student One",
 *   "role": "Student"
 * }
 * ```
 */
const deleteUser = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }
  const { username } = matchedData(request);
  try {
    const deletedUser: IUser | null = await User.findOneAndDelete({ username });
    if (!deletedUser) {
      response.sendStatus(404);
      return;
    }

    // Delete the corresponding Gitea user
    try {
      await giteaService.deleteUser(username);
      console.log(`Gitea user ${username} deleted successfully`);
    } catch (giteaError) {
      console.error(`Failed to delete Gitea user ${username}:`, giteaError);
      // Continue even if Gitea deletion fails — the local user is already removed
    }

    response.status(200).send(deletedUser);
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
};

/**
 * Updates a user's information. Admins can update any user; regular users can
 * only update themselves (and must provide their current password).
 *
 * @route `PATCH /api/users/:username`
 * @authentication Required (admin or self).
 *
 * @param request - Express request with `username` route parameter and update fields in body.
 *   Self-updates require `oldPassword` in the body. Only admins can change `role` or `studentId`.
 *   If `gitPublicKey` is provided, the Gitea SSH key is updated.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with confirmation message.
 * - `400 Bad Request` if missing `oldPassword` for self-update or validation fails.
 * - `403 Forbidden` if not authorized or password is incorrect.
 * - `404 Not Found` if the user does not exist.
 *
 * @example
 * ##### Request Body (self-update)
 * ```json
 * {
 *   "oldPassword": "currentPassword123",
 *   "displayName": "New Display Name",
 *   "password": "newPassword456"
 * }
 * ```
 *
 * ##### Request Body (admin update)
 * ```json
 * {
 *   "role": "TA",
 *   "studentId": "B98765432"
 * }
 * ```
 */
const updateUser = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { username: oldUsername } = request.params;
  const user = request.user as IUser;

  // Authorization: Only admin or self can update
  if (oldUsername !== user.username && user.role !== UserRole.JudgeAdmin) {
    response.status(403).send('Not authorized to update this user');
    return;
  }

  const updates = matchedData(request);

  // Only admin can change role, studentId, giteaId status
  if (user.role !== UserRole.JudgeAdmin) {
    delete updates.role;
    delete updates.studentId;
  }

  const { oldPassword } = request.body;

  // Require password verification for self-updates
  if (oldUsername === user.username) {
    if (!oldPassword) {
      response.status(400).send('Password is required to update profile');
      return;
    }

    const dbUser = await User.findOne({ username: oldUsername });
    if (!dbUser || dbUser.password !== hashString(oldPassword)) {
      response.status(403).send('Invalid password');
      return;
    }
  }

  // Ensure oldPassword is not in updates if it was passed
  delete updates.oldPassword;

  if (updates.password) {
    updates.password = hashString(updates.password);
  }

  try {
    // Gitea SSH Key update logic
    if (updates.gitPublicKey) {
      const existingUser = await User.findOne({ username: oldUsername });
      if (existingUser && updates.gitPublicKey !== existingUser.gitPublicKey) {
        console.log(`New public key detected for user ${oldUsername}, updating Gitea...`);
        try {
          // First, get existing keys (before adding new one)
          const existingKeys = await giteaService.getUserPublicKeys(oldUsername);

          // Add the new public key first (so user is never left without a key)
          await giteaService.addPublicKey(oldUsername, {
            key: updates.gitPublicKey,
            read_only: true,
            title: `OwoJudge SSH Key - ${new Date().toISOString()}`
          });

          // Then delete all old public keys
          for (const key of existingKeys) {
            console.log(`Deleting old public key ${key.id} (${key.title}) for user ${oldUsername}...`);
            await giteaService.deletePublicKey(oldUsername, key.id);
          }
        } catch (giteaError) {
          console.error(`Failed to update public key in Gitea for ${oldUsername}:`, giteaError);
          response.status(500).send({ message: 'Failed to update public key in Gitea', error: giteaError });
          return;
        }
      }
    }

    const updatedUser = await User.findOneAndUpdate({ username: oldUsername }, updates, { new: true });
    if (!updatedUser) {
      response.status(404).send('User not found');
      return;
    }
    response.status(200).send(`${oldUsername} updated`);
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};


usersRouter.get('/api/users', checkSchema(getUsersValidation), getAllUsers);
usersRouter.get('/api/users/:username', isAuthenticated, checkSchema(usernameParamValidation), getUserByUsername);
usersRouter.post('/api/users', isJudgeAdmin, checkSchema(createUserValidation), createUser);
usersRouter.delete('/api/users/:username', isJudgeAdmin, checkSchema(usernameParamValidation), deleteUser);
usersRouter.patch('/api/users/:username', isAuthenticated, checkSchema(usernameParamValidation), checkSchema(updateUserValidation), updateUser);

export default usersRouter;
export { getAllUsers, getUserByUsername, createUser, deleteUser, updateUser };
