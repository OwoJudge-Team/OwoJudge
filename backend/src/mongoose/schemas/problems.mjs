import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
    displayID: {
        type: mongoose.Schema.Types.String,
        require: true,
        unique: true,
    },
    createdTime: {
        type: mongoose.Schema.Types.Date,
        require: true,
    },
    title: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    description: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    inputFormat: {
        type: mongoose.Schema.Types.String,
    },
    outputFormat: {
        type: mongoose.Schema.Types.String,
    },
    timeLimit: {
        type: mongoose.Schema.Types.Number,
        require: true,
    },
    memoryLimit: {
        type: mongoose.Schema.Types.Number,
        require: true,
    },
    scorePolicy: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    testcase: [
        {
            input: mongoose.Schema.Types.String,
            output: mongoose.Schema.Types.String,
            point: mongoose.Schema.Types.Number,
            subtask: mongoose.Schema.Types.String,
        },
    ]
})

export const Problem = mongoose.model('Problem', problemSchema)