import { UserRole } from '../mongoose/schemas/users';

export const updateUserValidation = {
  displayName: {
    isLength: {
      options: {
        min: 1,
        max: 32
      },
      errorMessage: 'Length of displayName must between 4 to 32 characters'
    },
    isString: {
      errorMessage: 'displayName should be a string'
    },
    optional: true
  },
  password: {
    isLength: {
      options: {
        min: 8,
        max: 32
      },
      errorMessage: 'Length of password must between 8 to 32 characters'
    },
    isString: {
      errorMessage: 'Password should be a string'
    },
    optional: true
  },
  role: {
    isIn: {
      options: [Object.values(UserRole)],
      errorMessage: 'Invalid role'
    },
    optional: true
  },
  gitPublicKey: {
    isString: {
      errorMessage: 'Git public key should be a string'
    },
    optional: true
  },
  studentId: {
    isString: {
      errorMessage: 'studentId should be a string'
    },
    optional: true
  }
};
