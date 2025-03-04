export const getUsersValidation = {
    filter: {
        isLength: {
            options: {
                min: 2,
                max: 16,
            },
            errorMessage:
                'Length of filter field must between 2 to 16 characters',
        },
        isString: {
            errorMessage: 'Filter should be a string',
        },
    },
    value: {
        isLength: {
            options: {
                min: 1,
                max: 32,
            },
            errorMessage:
                'Length of value must between 1 to 32 characters',
        },
        isString: {
            errorMessage: 'Value should be a string',
        },
    },
}