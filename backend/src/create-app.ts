import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import usersRouter from './routes/users.js';
import problemsRouter from './routes/problems.js';
import submissionRouter from './routes/submission.js';
import authRouter from './routes/auth.js';
import contestsRouter from './routes/contests.js';
import webhookRouter from './routes/webhook.js';
import rejudgeRouter from './routes/rejudge.js';
import announcementRouter from './routes/announcement.js';
import proxyRouter from './routes/proxy.js';

// Custom middleware to apply express.json() only to non-multipart requests
// Also captures raw body for webhook signature verification
const conditionalJsonParser = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] || '';

  // Skip JSON parsing for multipart/form-data (file uploads)
  if (contentType.includes('multipart/form-data')) {
    return next();
  }

  // For all other requests, use the JSON parser with raw body capture
  return express.json({
    verify: (req: any, _res, buf) => {
      // Store the raw body buffer for webhook signature verification
      req.rawBody = buf;
    }
  })(req, res, next);
};

export const createApp = (): Application => {
  // Use environment variable for MongoDB URI, with fallback to localhost
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/judge';

  mongoose
    .connect(mongoUri)
    .then(() => console.log(`Connected to mongo at ${mongoUri}`))
    .catch((error: Error) => console.log(`Error: ${error.message}`));

  const app: Application = express();

  app.use(cors({
    origin: ['http://gitea:3000', 'http://localhost:3500'],
    credentials: true,
  }));

  const oneMinute: number = 60000;
  const oneHour: number = oneMinute * 60;

  // Use conditional JSON parsing instead of applying it globally
  app.use(conditionalJsonParser);
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(process.env.COOKIE_SECRET || 'cj6u.4t/6'));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'z/ fup6ql4',
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: oneHour * 24 * 120 // 120 days
      },
      store: MongoStore.create({
        client: mongoose.connection.getClient() as any
      })
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Place to put custom routes
  app.use(problemsRouter);
  app.use(usersRouter);
  app.use(submissionRouter);
  app.use(authRouter);
  app.use(contestsRouter);
  app.use(webhookRouter);
  app.use(rejudgeRouter);
  app.use(announcementRouter);
  app.use(proxyRouter);
  return app;
};
