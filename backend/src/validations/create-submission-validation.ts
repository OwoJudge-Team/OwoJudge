export const createSubmissionValidation = {
  problemID: {
    isLength: {
      options: {
        min: 4,
        max: 16
      },
      errorMessage: 'Length of problemID must between 4 to 16 characters'
    },
    notEmpty: {
      errorMessage: 'ProblemID should not be empty'
    },
    isString: {
      errorMessage: 'ProblemID should be a string'
    }
  },
  username: {
    isLength: {
      options: {
        min: 4,
        max: 32
      },
      errorMessage: 'Length of username must between 4 to 32 characters'
    },
    notEmpty: {
      errorMessage: 'Username should not be empty'
    },
    isString: {
      errorMessage: 'Username should be a string'
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
