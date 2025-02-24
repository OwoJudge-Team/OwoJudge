import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: mongoose.Schema.Types.String,
        require: true,
        unique: true,
    },
    displayName: {
        type: mongoose.Schema.Types.String,
        require: true,
    },
    password: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    isAdmin: {
        type: mongoose.Schema.Types.Boolean,
        required: true,
    },
    solvedProblem: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    solvedProblems: {
        type: mongoose.Schema.Types.Array,
        required: true,
    },
    rating: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    googleID: {
        type: mongoose.Schema.Types.String,
    },
})

export const User = mongoose.model('User', userSchema)