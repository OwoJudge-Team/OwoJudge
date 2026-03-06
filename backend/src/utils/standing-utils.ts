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

const MS_PER_SEC = 1000;
const SECS_PER_DAY = 60 * 60 * 24;
const GM_REDUCTION_SECS = SECS_PER_DAY;

/**
 * Calculates the effective score for a submission after applying late penalty.
 *
 * Formula: effective_score = submission_score * max(0, (1.0 - delay_secs / (5 * 86400)))
 * where delay_secs = max(0, (submission_time - end_time) in seconds - gm_secs)
 *
 * @param submissionScore - Raw score of the submission.
 * @param submissionTime - When the submission was created.
 * @param endTime - Contest end time (late penalty starts after this).
 * @param gmSecs - Number of seconds reduced by golden medals.
 * @returns The effective score after applying late penalty.
 */
const calculateEffectiveScore = (
    submissionScore: number,
    submissionTime: Date,
    endTime: Date | undefined,
    gmSecs: number
): number => {
    if (!endTime || submissionTime <= endTime) return submissionScore;

    const delayMs = submissionTime.getTime() - endTime.getTime();
    const delaySecs = Math.max(0, delayMs / MS_PER_SEC - gmSecs);
    const penaltyFactor = Math.max(0, (1.0 - delaySecs / (5 * SECS_PER_DAY)));
    return submissionScore * penaltyFactor;
};

export const updateUserStanding = async (contest: IContest, username: string, goldenMedalCount?: number) => {
    const problemSerialNumbers = contest.problems.map(p => p.serialNumber);

    if (goldenMedalCount === undefined) {
        const existingStanding = contest.standings.find(s => s.username === username);
        goldenMedalCount = existingStanding?.goldenMedalCount ?? 0;
    }

    const gmSecs = goldenMedalCount * GM_REDUCTION_SECS;

    const submissions = await Submission.find({
        problemSerialNumber: { $in: problemSerialNumbers },
        username: username,
        createdAt: {
            $gte: contest.startTime,
            $lte: contest.submissionEndTime
        }
    }).sort({ createdAt: 1 }); // Process in order

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

    for (const sub of submissions) {
        const pScore = problemScoresMap.get(sub.problemSerialNumber);
        if (!pScore) continue;

        const submissionScore = sub.score || 0;
        const effectiveScore = calculateEffectiveScore(
            submissionScore, sub.createdAt, contest.endTime, gmSecs
        );

        if (effectiveScore > pScore.score) {
            pScore.score = effectiveScore;
            pScore.lastSubmissionTime = sub.createdAt;
        }

        const problemDef = contest.problems.find(p => p.serialNumber === sub.problemSerialNumber);
        if (problemDef == undefined) {
            console.log(`[Update Standing] Problem: ${sub.problemSerialNumber} is not found for submission: ${sub.serialNumber}`)
            return;
        }
        const maxScore = problemDef.score;

        if (effectiveScore >= maxScore) {
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
        submissionCount: totalSubmissionCount,
        goldenMedalCount
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
