# Database Schema

This document describes the Mongoose schemas used in the OwoJudge application.

## User Schema

The `User` schema stores information about registered users.

- `username` (String, required, unique): The user's unique username.
- `displayName` (String, required): The user's display name.
- `password` (String, required): The user's hashed password.
- `isAdmin` (Boolean, required): Indicates if the user has administrative privileges.
- `solvedProblem` (Number, required): The number of problems the user has solved.
- `solvedProblems` (Array, required): A list of IDs of the problems the user has solved.
- `rating` (Number, required): The user's rating.

## Problem Schema

The `Problem` schema stores all data related to a specific programming problem.

- `serialNumber` (Number, unique): An auto-incremented serial number for the problem.
- `createdTime` (Date, required, default: now): The timestamp when the problem was created.
- `title` (String, required): The title of the problem.
- `timeLimit` (Number, required): The time limit for execution, in seconds.
- `memoryLimit` (Number, required): The memory limit for execution, in kilobytes.
- `processes` (Number, required, default: 1): The number of processes allowed.
- `fullScore` (Number, required): The total score for the problem.
- `scorePolicy` (String, required, enum: `sum`, `max`, `min`): The policy for calculating scores from subtasks.
- `testcase` (Array of Objects): An array of test case objects.
    - `filename` (String): The filename of the test case.
    - `point` (Number): The points awarded for passing this test case.
    - `subtask` (String): The subtask this test case belongs to.
- `tags` (Array of Strings): Tags for categorizing the problem.
- `problemRelatedTags` (Array of Strings): Related tags for the problem.
- `submissionDetail` (Object): Statistics about submissions for this problem.
    - `accepted` (Number, default: 0)
    - `submitted` (Number, default: 0)
    - `timeLimitExceeded` (Number, default: 0)
    - `memoryLimitExceeded` (Number, default: 0)
    - `wrongAnswer` (Number, default: 0)
    - `runtimeError` (Number, default: 0)
    - `compilationError` (Number, default: 0)
    - `processLimitExceeded` (Number, default: 0)
- `userDetail` (Object): Statistics about user performance on this problem.
    - `solved` (Number, default: 0)
    - `attempted` (Number, default: 0)

## Submission Schema

The `Submission` schema records each code submission made by a user.

- `serialNumber` (Number, unique, auto-increment): A unique serial number for the submission (starts from 1,000,000).
- `problemSerialNumber` (Number, required): The serial number of the problem.
- `problemTitle` (String, required): The title of the problem.
- `username` (String, required): The username of the user who made the submission.
- `userHandle` (String, required): The handle/display name of the user.
- `userID` (ObjectId, required, ref: `User`): The ID of the user.
- `language` (String, required): The programming language of the submission.
- `userSolution` (Array of Objects): An array of objects containing the solution's filename and content.
    - `filename` (String, required)
    - `content` (String, required)
- `status` (String, enum, default: `Pending`): The current status of the submission. Values conform to `SubmissionStatus` enum.
- `createdTime` (Date, default: now): The timestamp of the submission.
- `score` (Number, default: 0): The score awarded to the submission.
- `results` (Array of Objects): An array of results for each test case.
    - `testcase` (String, required): The name of the test case.
    - `status` (String, required): The status for this specific test case.
    - `time` (Number, required): Time used.
    - `memory` (Number, required): Memory used.
    - `message` (String): Optional message.

## Contest Schema

The `Contest` schema defines a programming contest.

- `contestID` (String, required, unique): A unique identifier for the contest.
- `title` (String, required): The title of the contest.
- `description` (String, required): A description of the contest.
- `startTime` (Date, required): The start time of the contest.
- `endTime` (Date, required): The end time of the contest.
- `problems` (Array of Objects): An array of problem objects included in the contest.
    - `serialNumber` (Number): The problem serial number.
    - `score` (Number): The score assigned to the problem in this contest.
- `standings` (Array of Objects): The current standings of the contest.
    - `username` (String, required)
    - `totalScore` (Number, default: 0)
    - `solvedCount` (Number, default: 0)
    - `lastSubmissionTime` (Date)
    - `problemScores` (Array of Objects):
        - `serialNumber` (Number)
        - `score` (Number)
        - `lastSubmissionTime` (Date)
