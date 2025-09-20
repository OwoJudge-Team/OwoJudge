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

- `problemID` (String, required, unique): A unique identifier for the problem.
- `createdTime` (Date, required): The timestamp when the problem was created.
- `title` (String, required): The title of the problem.
- `timeLimit` (Number, required): The time limit for execution, in seconds.
- `memoryLimit` (Number, required): The memory limit for execution, in kilobytes.
- `processes` (Number, required, default: 1): The number of processes allowed.
- `fullScore` (Number, required): The total score for the problem.
- `description` (String, required): A detailed description of the problem.
- `inputDescription` (String, required): A description of the input format.
- `scorePolicy` (String, required, enum: `sum`, `max`): The policy for calculating scores from subtasks.
- `testcase` (Array): An array of test case objects.
- `tags` (Array of Strings): Tags for categorizing the problem.
- `submissionDetail` (Object): Statistics about submissions for this problem.
- `userDetail` (Object): Statistics about user performance on this problem.

## Submission Schema

The `Submission` schema records each code submission made by a user.

- `serialNumber` (Number, unique, auto-increment): A unique serial number for the submission.
- `problemID` (String, required): The ID of the problem being submitted.
- `username` (String, required): The username of the user who made the submission.
- `language` (String, required): The programming language of the submission.
- `userSolution` (Array): An array of objects containing the solution's filename and content.
- `status` (String, enum, default: `Pending`): The current status of the submission.
- `createdTime` (Date, default: now): The timestamp of the submission.
- `score` (Number, default: 0): The score awarded to the submission.
- `results` (Array): An array of results for each test case.

## Contest Schema

The `Contest` schema defines a programming contest.

- `contestID` (String, required, unique): A unique identifier for the contest.
- `title` (String, required): The title of the contest.
- `description` (String, required): A description of the contest.
- `startTime` (Date, required): The start time of the contest.
- `endTime` (Date, required): The end time of the contest.
- `problems` (Array): An array of problem objects included in the contest.
