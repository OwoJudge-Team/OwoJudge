import { Schema } from 'express-validator';

export const updateContestValidation: Schema = {
  contestID: {
    in: ['body'],
    optional: true,
    isString: true,
    notEmpty: true,
    errorMessage: 'Contest ID must be a string'
  },
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
    isISO8601: true,
    toDate: true,
    errorMessage: 'Start time must be a valid date'
  },
  endTime: {
    in: ['body'],
    optional: true,
    isISO8601: true,
    toDate: true,
    errorMessage: 'End time must be a valid date'
  },
  problems: {
    in: ['body'],
    optional: true,
    isArray: true,
    errorMessage: 'Problems must be an array of problem IDs'
  }
};
