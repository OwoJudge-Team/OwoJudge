import { Location } from 'express-validator';

export const giteaWebhookValidation = {
  'commits': {
    in: ['body'] as Location[],
    isArray: {
      errorMessage: 'Commits must be an array'
    },
    notEmpty: {
      errorMessage: 'Commits array should not be empty'
    }
  },
  'commits.*.id': {
    in: ['body'] as Location[],
    isString: {
      errorMessage: 'Commit ID must be a string'
    },
    notEmpty: {
      errorMessage: 'Commit ID should not be empty'
    }
  },
  'commits.*.added': {
    in: ['body'] as Location[],
    isArray: {
      errorMessage: 'Commit added files must be an array'
    }
  },
  'commits.*.modified': {
    in: ['body'] as Location[],
    isArray: {
      errorMessage: 'Commit modified files must be an array'
    }
  },
  'repository.owner.username': {
    in: ['body'] as Location[],
    isString: {
      errorMessage: 'Repository owner username must be a string'
    },
    notEmpty: {
      errorMessage: 'Repository owner username should not be empty'
    }
  },
  'repository.name': {
    in: ['body'] as Location[],
    isString: {
      errorMessage: 'Repository name must be a string'
    },
    notEmpty: {
      errorMessage: 'Repository name should not be empty'
    }
  },
  'pusher.id': {
    in: ['body'] as Location[],
    isInt: {
      errorMessage: 'Pusher ID must be an integer'
    },
    notEmpty: {
      errorMessage: 'Pusher ID should not be empty'
    }
  },
  'pusher.username': {
    in: ['body'] as Location[],
    isString: {
      errorMessage: 'Pusher username must be a string'
    },
    notEmpty: {
      errorMessage: 'Pusher username should not be empty'
    }
  }
};
