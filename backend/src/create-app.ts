import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import usersRouter from './routes/users.js';
import problemsRouter from './routes/problems.js';
import submissionRouter from './routes/submission.js';
import authRouter from './routes/auth.js';

// Custom middleware to apply express.json() only to non-multipart requests
const conditionalJsonParser = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] || '';
  
  // Skip JSON parsing for multipart/form-data (file uploads)
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  
  // For all other requests, use the JSON parser
  return express.json()(req, res, next);
};

export const createApp = (): Application => {
  mongoose
    .connect('mongodb://localhost/judge')
    .then(() => console.log('Connected to mongo'))
    .catch((error: Error) => console.log(`Error: ${error.message}`));

  const app: Application = express();
  const oneMinute: number = 60000;
  const oneHour: number = oneMinute * 60;
  
  // Use conditional JSON parsing instead of applying it globally
  app.use(conditionalJsonParser);
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser('cj6u.4t/6'));
  app.use(
    session({
      secret: 'z/ fup6ql4',
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: oneHour * 24 // One Day
      },
      store: MongoStore.create({
        client: mongoose.connection.getClient()
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
  return app;
};
