import { Schema } from 'express-validator';

export const updateContestValidation: Schema = {
  title: {
    in: ['body'],
    optional: true,
    isString: true,
    notEmpty: true,
    errorMessage: 'Title must be a string'
  },
  description: {
    in: ['body'],
    optional: true,
    isString: true,
    notEmpty: true,
    errorMessage: 'Description must be a string'
  },
  startTime: {
    in: ['body'],
    optional: true,
    isISO8601: {
      options: { strict: false }
    },
    toDate: true,
    errorMessage: 'Start time must be a valid date'
  },
  endTime: {
    in: ['body'],
    optional: true,
    isISO8601: {
      options: { strict: false }
    },
    toDate: true,
    errorMessage: 'End time must be a valid date'
  },
  submissionEndTime: {
    in: ['body'],
    optional: true,
    isISO8601: {
      options: { strict: false }
    },
    toDate: true,
    errorMessage: 'Submission end time must be a valid date'
  },
  released: {
    in: ['body'],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: 'Released must be a boolean'
  },
  canApplyGM: {
    in: ['body'],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: 'canApplyGM must be a boolean'
  },
  problems: {
    in: ['body'],
    optional: true,
    isArray: true,
    errorMessage: 'Problems must be an array of problem IDs'
  }
};
