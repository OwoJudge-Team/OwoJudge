import mongoose, { Document, Schema } from "mongoose";

interface IUserSolution {
    filename: string;
    content: string;
}

interface IIndividualResult {
    status: string;
    time: number;
    memory: number;
}

interface IResult {
    score: number;
    maxTime: number;
    maxMemory: number;
    individual: IIndividualResult[];
}

interface ISubmission extends Document {
    createdTime: Date;
    status: string;
    language: string;
    username: string;
    problemID: string;
    userSolution: IUserSolution[];
    result: IResult;
}

const submissionSchema: Schema = new mongoose.Schema({
    createdTime: {
        type: mongoose.Schema.Types.Date,
        required: true,
    },
    status: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    language: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    username: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    problemID: {
        type: mongoose.Schema.Types.String,
        required: true,
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
});

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
export { IUserSolution, IIndividualResult, IResult, ISubmission };