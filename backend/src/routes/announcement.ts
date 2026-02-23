import { Router, Response } from 'express';
import { checkSchema, validationResult } from 'express-validator';
import { Announcement } from '../mongoose/schemas/announcement';
import { isTA } from '../middleware/auth';
import { IRequest } from '../utils/request-interface';

const announcementRouter = Router();

const getAnnouncements = async (request: IRequest, response: Response) => {
  try {
    const announcements = await Announcement.find().sort({ timestamp: -1 });
    response.status(200).json(announcements);
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
};

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