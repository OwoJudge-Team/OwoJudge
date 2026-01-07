import { Schema } from 'express-validator';

export const createContestValidation: Schema = {
  title: {
    in: ['body'],
    isString: true,
    notEmpty: true,
    errorMessage: 'Title is required'
  },
  description: {
    in: ['body'],
    isString: true,
    notEmpty: true,
    errorMessage: 'Description is required'
  },
  startTime: {
    in: ['body'],
    isISO8601: {
      options: { strict: false }
    },
    toDate: true,
    errorMessage: 'Start time must be a valid date'
  },
  endTime: {
    in: ['body'],
    isISO8601: {
      options: { strict: false }
    },
    toDate: true,
    errorMessage: 'End time must be a valid date'
  },
  released: {
    in: ['body'],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: 'Released must be a boolean'
  },
  problems: {
    in: ['body'],
    isArray: true,
    errorMessage: 'Problems must be an array of problem IDs'
  }
};
