export const createUserValidation = {
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
  displayName: {
    isLength: {
      options: {
        min: 4,
        max: 32
      },
      errorMessage: 'Length of displayName must between 4 to 32 characters'
    },
    notEmpty: {
      errorMessage: 'displayName should not be empty'
    },
    isString: {
      errorMessage: 'displayName should be a string'
    }
  },
  password: {
    isLength: {
      options: {
        min: 8,
        max: 32
      },
      errorMessage: 'Length of password must between 8 to 32 characters'
    },
    notEmpty: {
      errorMessage: 'Password should not be empty'
    },
    isString: {
      errorMessage: 'Password should be a string'
    }
  },
  isAdmin: {
    notEmpty: {
      errorMessage: 'isAdmin should not be empty'
    }
  }
};
