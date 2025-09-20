import { Schema } from 'express-validator';

export const createContestValidation: Schema = {
  contestID: {
    in: ['body'],
    isString: true,
    notEmpty: true,
    errorMessage: 'Contest ID is required'
  },
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
    isISO8601: true,
    toDate: true,
    errorMessage: 'Start time must be a valid date'
  },
  endTime: {
    in: ['body'],
    isISO8601: true,
    toDate: true,
    errorMessage: 'End time must be a valid date'
  },
  problems: {
    in: ['body'],
    isArray: true,
    errorMessage: 'Problems must be an array of problem IDs'
  }
};
