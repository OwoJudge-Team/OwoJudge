import { Schema } from 'express-validator';

export const usernameParamValidation: Schema = {
    username: {
        in: ['params'],
        isLength: {
            options: {
                min: 4,
                max: 32
            },
            errorMessage: 'Length of username must between 4 to 32 characters'
        },
        isString: {
            errorMessage: 'Username should be a string'
        }
    }
};
