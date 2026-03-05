import { Contest, IContest, UserStanding, ProblemScore } from '../mongoose/schemas/contests';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from './submission-status';

export const updateContestStanding = async (submission: ISubmission) => {
    const now = submission.createdAt;
    // Find active contests containing this problem
    const contests = await Contest.find({
        "problems.serialNumber": submission.problemSerialNumber,
        startTime: { $lte: now },
        submissionEndTime: { $gte: now }
    });

    for (const contest of contests) {
        await updateUserStanding(contest, submission.username);
    }
};

export const updateUserStanding = async (contest: IContest, username: string) => {
    // 1. Get all submissions for this user for problems in this contest within time range
    const problemSerialNumbers = contest.problems.map(p => p.serialNumber);

    // We only care about submissions strictly within the contest window
    const submissionEndTime = contest.submissionEndTime;
    const submissions = await Submission.find({
        problemSerialNumber: { $in: problemSerialNumbers },
        username: username,
        createdAt: {
            $gte: contest.startTime,
            $lte: submissionEndTime
        }
    }).sort({ createdAt: 1 }); // Process in order

    // 2. Initialize standing data
    let totalScore = 0;
    let solvedCount = 0;
    let totalSubmissionCount = 0;
    const problemScoresMap = new Map<number, ProblemScore>();

    // Initialize map with 0s
    for (const p of contest.problems) {
        problemScoresMap.set(p.serialNumber, {
            serialNumber: p.serialNumber,
            score: 0,
            solved: false,
            submissionCount: 0
        });
    }

    // 3. Process submissions
    for (const sub of submissions) {
        const pScore = problemScoresMap.get(sub.problemSerialNumber);
        if (!pScore) continue;

        const submissionScore = sub.score || 0;

        if (submissionScore > pScore.score) {
            pScore.score = submissionScore;
            pScore.lastSubmissionTime = sub.createdAt;
        }

        const problemDef = contest.problems.find(p => p.serialNumber === sub.problemSerialNumber);
        const maxScore = problemDef ? problemDef.score : 100;

        if (submissionScore >= maxScore) {
            pScore.solved = true;
        }

        let cost = 1;
        if (sub.status === SubmissionStatus.CE) {
            cost = 5;
        } else if (sub.status === SubmissionStatus.RE) {
            cost = 3;
        } else if (sub.status === SubmissionStatus.PD || sub.status === SubmissionStatus.QU || sub.status === SubmissionStatus.SE) {
            cost = 0;
        }

        pScore.submissionCount = (pScore.submissionCount || 0) + cost;
        totalSubmissionCount += cost;
    }

    // 4. Summarize
    let lastSubmissionTime: Date | undefined = undefined;

    for (const [, pScore] of problemScoresMap) {
        totalScore += pScore.score;
        if (pScore.solved) solvedCount++;

        if (pScore.lastSubmissionTime) {
            if (!lastSubmissionTime || pScore.lastSubmissionTime > lastSubmissionTime) {
                lastSubmissionTime = pScore.lastSubmissionTime;
            }
        }
    }

    // 5. Update Contest atomically using findOneAndUpdate
    const newStanding: UserStanding = {
        username,
        totalScore,
        solvedCount,
        problemScores: Array.from(problemScoresMap.values()),
        lastSubmissionTime,
        submissionCount: totalSubmissionCount
    };

    // Try to update existing standing first
    const updated = await Contest.findOneAndUpdate(
        { _id: contest._id, 'standings.username': username },
        { $set: { 'standings.$': newStanding } },
        { runValidators: true }
    );

    // If no existing standing was found, push a new one
    if (!updated) {
        let pushed = await Contest.findOneAndUpdate(
            { _id: contest._id, 'standings.username': { $ne: username } },
            { $push: { standings: newStanding } },
            { runValidators: true }
        );

        if (!pushed) {
            await Contest.findOneAndUpdate(
                { _id: contest._id, 'standings.username': username },
                { $set: { 'standings.$': newStanding } }
            );
        }
    }
};

export const recalculateContestStandings = async (contestId: string) => {
    const contest = await Contest.findById(contestId);
    if (!contest) throw new Error('Contest not found');

    const problemSerialNumbers = contest.problems.map(p => p.serialNumber);
    const submissionEndTime = contest.submissionEndTime || contest.endTime;

    // Find all users who have submitted to this contest
    const users = await Submission.distinct('username', {
        problemSerialNumber: { $in: problemSerialNumbers },
        createdAt: {
            $gte: contest.startTime,
            $lte: submissionEndTime
        }
    });

    contest.standings = [];
    await contest.save();

    for (const username of users) {
        if (typeof username === 'string') {
            await updateUserStanding(contest, username);
        }
    }

    // Refresh the contest from the database to get the updated standings
    const updatedContest = await Contest.findById(contestId);
    return updatedContest || contest;
};
