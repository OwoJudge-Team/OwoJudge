import mongoose from "mongoose"

const submissionSchema = new mongoose.Schema({
    createdTime: {
        type: mongoose.Schema.Types.Date,
        require: true,
    },
    status: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    language: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    username: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    problemID: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    userSolution: [
        {
            filename: mongoose.Schema.Types.String,
            content: mongoose.Schema.Types.String,
        },
    ],
    result: {
        score: mongoose.Schema.Types.Number,
        maxTime: mongoose.Schema.Types.Number,
        maxMemory: mongoose.Schema.Types.Number,
        individual: [
            {
                status: mongoose.Schema.Types.String,
                time: mongoose.Schema.Types.Number,
                memory: mongoose.Schema.Types.Number,
            },
        ],
    },
})

export const Submission = mongoose.model('Submission', submissionSchema)