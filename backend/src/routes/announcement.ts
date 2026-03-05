/**
 * Announcement management routes.
 *
 * Endpoints for creating, reading, and updating announcements.
 *
 * @module Announcements
 */

import { Router, Response } from 'express';
import { checkSchema, validationResult } from 'express-validator';
import { Announcement } from '../mongoose/schemas/announcement';
import { isTA } from '../middleware/auth';
import { IRequest } from '../utils/request-interface';

const announcementRouter = Router();

/**
 * Retrieves all announcements, sorted by timestamp (newest first).
 *
 * @route `GET /api/announcement`
 *
 * @param request - Express request.
 * @param response - Express response.
 *
 * @returns `200 OK` with an array of announcement objects.
 * 
 * @example
 * ##### Response Body
 * ```json
 * [
 *   {
 *     "_id": "68fb8a12b3c4d5e6f7890123",
 *     "topic": "Welcome to OwoJudge",
 *     "content": "We are excited to announce the launch of OwoJudge!",
 *     "timestamp": "2025-10-25T08:00:00.000Z"
 *   }
 * ]
 * ```
 */
const getAnnouncements = async (request: IRequest, response: Response) => {
  try {
    const announcements = await Announcement.find().sort({ timestamp: -1 });
    response.status(200).json(announcements);
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves a single announcement by its MongoDB ObjectId.
 *
 * @route `GET /api/announcement/:id`
 *
 * @param request - Express request with `id` route parameter.
 * @param response - Express response.
 *
 * @returns `200 OK` with the announcement object.
 * @returns `404 Not Found` if the announcement does not exist.
 * 
 * @example
 * ```json
 * {
 *   "_id": "68fb8a12b3c4d5e6f7890123",
 *   "topic": "Welcome to OwoJudge",
 *   "content": "We are excited to announce the launch of OwoJudge!",
 *   "timestamp": "2025-10-25T08:00:00.000Z"
 * }
 * ```
 */
const getAnnouncementByID = async (request: IRequest, response: Response) => {
  try {
    const announcement = await Announcement.findById(request.params.id);
    if (!announcement) {
      response.status(404).json({ error: 'Announcement not found' });
      return;
    }
    response.status(200).json(announcement);
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Creates a new announcement.
 *
 * @route `POST /api/announcement`
 * @authentication Required. TA or JudgeAdmin only.
 *
 * @param request - Express request. Body must contain:
 *   - `topic` (string) - announcement topic / title.
 *   - `content` (string) - announcement body.
 * @param response - Express response.
 *
 * @returns `201 Created` with the saved announcement object.
 * @returns `400 Bad Request` if validation fails.
 * 
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "topic": "Welcome to OwoJudge",
 *   "content": "We are excited to announce the launch of OwoJudge!"
 * }
 * ```
 */
const createAnnouncement = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { topic, content } = request.body;
    const announcement = new Announcement({
      topic,
      content,
      timestamp: new Date()
    });
    await announcement.save();
    response.status(201).json(announcement);
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Updates an existing announcement.
 * Only the provided fields (`topic`, `content`) are updated; the `timestamp` is refreshed.
 *
 * @route `PUT /api/announcement/:id`
 * @authentication Required. TA or JudgeAdmin only.
 *
 * @param request - Express request with `id` route parameter. Body may contain:
 *   - `topic` (string, optional) - new topic.
 *   - `content` (string, optional) - new content.
 * @param response - Express response.
 *
 * @returns `200 OK` with the updated announcement object.
 * @returns `400 Bad Request` if validation fails.
 * @returns `404 Not Found` if the announcement does not exist.
 * 
 * @example
 * ```json
 * {
 *   "content": "The maintenance has been rescheduled."
 * }
 * ```
 */
const updateAnnouncement = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const announcement = await Announcement.findById(request.params.id);

    if (!announcement) {
      response.status(404).json({ error: 'Announcement not found' });
      return;
    }

    const { topic, content } = request.body;
    if (topic) announcement.topic = topic;
    if (content) announcement.content = content;
    announcement.timestamp = new Date();

    await announcement.save();
    response.status(200).json(announcement);
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
};

announcementRouter.get('/api/announcement', getAnnouncements);
announcementRouter.get('/api/announcement/:id', getAnnouncementByID);

announcementRouter.post(
  '/api/announcement',
  isTA,
  checkSchema({
    topic: {
      in: ['body'],
      notEmpty: {
        errorMessage: 'Topic is required'
      }
    },
    content: {
      in: ['body'],
      notEmpty: {
        errorMessage: 'Content is required'
      }
    }
  }),
  createAnnouncement
);

announcementRouter.put(
  '/api/announcement/:id',
  isTA,
  checkSchema({
    topic: {
      in: ['body'],
      optional: true,
      notEmpty: {
        errorMessage: 'Topic cannot be empty'
      }
    },
    content: {
      in: ['body'],
      optional: true,
      notEmpty: {
        errorMessage: 'Content cannot be empty'
      }
    }
  }),
  updateAnnouncement
);

export default announcementRouter;
export {
  getAnnouncements,
  getAnnouncementByID,
  createAnnouncement,
  updateAnnouncement
};