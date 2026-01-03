export const createSubmissionValidation = {
  problemSerialNumber: {
    isInt: {
      errorMessage: 'ProblemSerialNumber should be an integer'
    },
    notEmpty: {
      errorMessage: 'ProblemSerialNumber should not be empty'
    }
  },
  language: {
    isLength: {
      options: {
        min: 4,
        max: 32
      },
      errorMessage: 'Length of language must between 4 to 32 characters'
    },
    notEmpty: {
      errorMessage: 'Language should not be empty'
    },
    isString: {
      errorMessage: 'Language should be a string'
    }
  },
  userSolution: {
    isArray: {
      errorMessage: 'UserSolution should be an array'
    }
  },
  'userSolution.*.filename': {
    isLength: {
      options: {
        min: 4,
        max: 32
      },
      errorMessage: 'Length of filename must between 4 to 32 characters'
    },
    notEmpty: {
      errorMessage: 'Filename should not be empty'
    },
    isString: {
      errorMessage: 'Filename should be a string'
    }
  },
  'userSolution.*.content': {
    isLength: {
      options: {
        max: 1024 * 1024
      },
      errorMessage: 'Size of content must less than 1MB'
    },
    notEmpty: {
      errorMessage: 'Content should not be empty'
    },
    isString: {
      errorMessage: 'Content should be a string'
    }
  }
};
