import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { validationResult, checkSchema, matchedData } from 'express-validator';
import { giteaService } from '../utils/gitea-service';
import { Submission, ISubmission, IUserSolution } from '../mongoose/schemas/submission';
import { User } from '../mongoose/schemas/users';
import { Problem, ProblemStatus } from '../mongoose/schemas/problems';
import { giteaWebhookValidation } from '../validations/gitea-webhook-validation';
import { submitUserSubmission } from '../judger/judger';

const webhookRouter: Router = Router();

// Gitea webhook payload interfaces
interface GiteaWebhookCommit {
    id: string;
    added: string[];
    modified: string[];
}

interface GiteaWebhookRepository {
    owner: {
        username: string;
    };
    name: string;
}

interface GiteaWebhookPayload {
    commits: GiteaWebhookCommit[];
    repository: GiteaWebhookRepository;
    pusher: {
        id: number;
        username: string;
    };
}

/**
 * Extract problem serial number and validate language from filename
 * Expected format: [serialnumber].c (only C files are supported for git submissions)
 * Returns { problemSerialNumber, language } or null if file is invalid/unsupported
 */
const extractProblemInfo = (filename: string): { problemSerialNumber: number; language: string } | null => {
    // Extract extension
    const ext = filename.split('.').pop()?.toLowerCase();

    // Only C files are supported
    if (ext !== 'c') {
        return null;
    }

    // Extract problem serial number (everything before the extension)
    const match = filename.match(/^(\d+)\.c$/);
    if (!match) {
        return null;
    }

    const serialNumber = parseInt(match[1], 10);
    if (isNaN(serialNumber)) {
        return null;
    }

    return {
        problemSerialNumber: serialNumber,
        language: 'gcc c17'
    };
};

/**
 * Middleware to verify Gitea webhook signature using HMAC-SHA256 shared secret.
 * Gitea sends the signature in the X-Gitea-Signature header.
 */
const verifyWebhookSecret = (req: Request, res: Response, next: NextFunction): void => {
    const secret = process.env.GITEA_WEBHOOK_SECRET;
    if (!secret) {
        console.warn('[Webhook] GITEA_WEBHOOK_SECRET not set, skipping signature verification');
        next();
        return;
    }

    const signature = req.headers['x-gitea-signature'] as string | undefined;
    if (!signature) {
        console.error('[Webhook] Missing X-Gitea-Signature header');
        res.status(403).send({ error: 'Missing webhook signature' });
        return;
    }

    // Use the raw body buffer captured by express.json({ verify }) for HMAC computation.
    // JSON.stringify(req.body) re-serializes the parsed object which may differ from the
    // original bytes that Gitea used to compute the signature.
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
        console.error('[Webhook] Raw body not available for signature verification');
        res.status(500).send({ error: 'Raw body not available' });
        return;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const isValid = signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));


    console.log(`[Webhook] Received signature: ${signature}`);
    console.log(`[Webhook] Expected signature: ${expectedSignature}`);
    if (!isValid) {
        console.error('[Webhook] Invalid webhook signature');
        res.status(403).send({ error: 'Invalid webhook signature' });
        return;
    }

    console.log('[Webhook] Signature verified successfully');
    next();
};

/**
 * Handle Gitea webhook for push events
 */
export const handleGiteaWebhook = async (request: Request, response: Response): Promise<void> => {
    // Log incoming webhook request FIRST to confirm it's reaching the handler
    console.log('='.repeat(80));
    console.log('[Webhook] Incoming request to /api/webhook/gitea');
    console.log(`[Webhook] Method: ${request.method}`);
    console.log(`[Webhook] Content-Type: ${request.headers['content-type']}`);
    console.log(`[Webhook] Headers:`, JSON.stringify(request.headers, null, 2));
    console.log(`[Webhook] Body preview:`, JSON.stringify(request.body, null, 2).substring(0, 500));
    console.log('='.repeat(80));

    try {
        // Validate request payload
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            console.error('[Webhook] Validation errors:', errors.array());
            response.status(400).send({
                error: 'Invalid webhook payload',
                details: errors.array()
            });
            return;
        }

        const data = matchedData(request);
        const payload: GiteaWebhookPayload = data as GiteaWebhookPayload;

        console.log('[Webhook] Received Gitea webhook');
        console.log(`[Webhook] Pusher: ${payload.pusher.username}`);
        console.log(`[Webhook] Commits: ${payload.commits.length}`);

        // Find user by Gitea ID
        const giteaUserId = payload.pusher.id;
        const owoUser = await User.findOne({ giteaId: giteaUserId });

        if (!owoUser) {
            console.log(`[Webhook] User with Gitea ID ${giteaUserId} (${payload.pusher.username}) not found in database, falling back to pusher username`);
            response.status(404).send({ error: 'User not found' });
            return;
        }

        const submissionUsername = owoUser.username;
        let totalSubmissions = 0;

        // Process each commit
        for (const commit of payload.commits) {
            console.log(`[Webhook] Processing commit: ${commit.id.substring(0, 7)}`);

            // Get all modified and added files
            const changedFiles = [...commit.added, ...commit.modified];
            if (changedFiles.length === 0) {
                console.log('[Webhook] No files changed, skipping');
                continue;
            }

            console.log(`[Webhook] Changed files: ${changedFiles.join(', ')}`);

            // Group files by problem serial number (only valid C files)
            const filesByProblemSerialNumber: Map<number, { filepaths: string[]; language: string }> = new Map();

            for (const filepath of changedFiles) {
                // Extract filename from path
                const filename = filepath.split('/').pop() || filepath;
                const problemInfo = extractProblemInfo(filename);

                if (problemInfo) {
                    if (!filesByProblemSerialNumber.has(problemInfo.problemSerialNumber)) {
                        filesByProblemSerialNumber.set(problemInfo.problemSerialNumber, { filepaths: [], language: problemInfo.language });
                    }
                    filesByProblemSerialNumber.get(problemInfo.problemSerialNumber)!.filepaths.push(filepath);
                    console.log(`[Webhook] File ${filename} matched to problem serial number: ${problemInfo.problemSerialNumber}`);
                } else {
                    console.log(`[Webhook] File ${filename} is not a valid C file or does not match pattern [serialnumber].c, skipping`);
                }
            }

            if (filesByProblemSerialNumber.size === 0) {
                console.log('[Webhook] No valid C files with problem serial number pattern found, skipping');
                continue;
            }

            // Create a submission for each problem serial number
            for (const [problemSerialNumber, { filepaths, language }] of filesByProblemSerialNumber.entries()) {
                console.log(`[Webhook] Processing problem serial number: ${problemSerialNumber} with ${filepaths.length} file(s)`);

                const userSolution: IUserSolution[] = [];

                for (const filepath of filepaths) {
                    try {
                        console.log(`[Webhook] Fetching file: ${filepath}`);
                        const fileContent = await giteaService.getFileContent(
                            payload.repository.owner.username,
                            payload.repository.name,
                            filepath,
                            commit.id
                        );

                        // Decode base64 content
                        const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

                        userSolution.push({
                            filename: 'main.c',
                            content: content
                        });

                        console.log(`[Webhook] Successfully fetched file: ${filepath} (${fileContent.size} bytes)`);
                    } catch (error) {
                        console.error(`[Webhook] Error fetching file ${filepath}:`, error);
                        // Continue with other files even if one fails
                    }
                }

                if (userSolution.length === 0) {
                    console.log(`[Webhook] No valid files found for problem ${problemSerialNumber}, skipping submission`);
                    continue;
                }

                // Fetch problem to get the title
                const problem = await Problem.findOne({ serialNumber: problemSerialNumber });
                if (!problem) {
                    console.error(`[Webhook] Problem with serial number ${problemSerialNumber} not found, skipping submission`);
                    continue;
                }
                if (problem.status !== ProblemStatus.Ready) {
                    console.error(`[Webhook] Problem with serial number ${problemSerialNumber} is not ready, skipping submission`);
                    continue;
                }

                // Check daily quota
                if (problem.dailyQuota && problem.dailyQuota > 0) {
                    if (!owoUser.quotaUsage) {
                        owoUser.quotaUsage = new Map();
                    }

                    const problemID = problem.id.toString();
                    const usage = owoUser.quotaUsage.get(problemID);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Reset quota if it's a new day or no usage record exists
                    let currentCount = 0;
                    if (usage && usage.date >= today) {
                        currentCount = usage.count;
                    }

                    if (currentCount >= problem.dailyQuota) {
                        console.log(`[Webhook] Daily quota exceeded for user ${submissionUsername} on problem ${problemSerialNumber}. Skipping.`);
                        continue;
                    }

                    // Increment quota usage
                    owoUser.quotaUsage.set(problemID, {
                        count: currentCount + 1,
                        date: today
                    });

                    // Save user quota update
                    await owoUser.save();
                }

                console.log(`[Webhook] owoUser found:`, JSON.stringify({
                    _id: owoUser._id,
                    username: owoUser.username,
                    displayName: owoUser.displayName,
                    giteaId: owoUser.giteaId
                }, null, 2));

                console.log(`[Webhook] problem found:`, JSON.stringify({
                    serialNumber: problem.serialNumber,
                    title: problem.title
                }, null, 2));

                const submissionData: Partial<ISubmission> = {
                    problemSerialNumber: problemSerialNumber,
                    problemTitle: problem.title,
                    username: submissionUsername,
                    userID: owoUser._id as any,
                    language: language,
                    userSolution: userSolution
                };

                console.log(`[Webhook] Submission data to be saved:`, JSON.stringify({
                    problemSerialNumber: submissionData.problemSerialNumber,
                    problemTitle: submissionData.problemTitle,
                    username: submissionData.username,
                    userID: submissionData.userID,
                    language: submissionData.language
                }, null, 2));

                console.log(`[Webhook] Creating submission for problem ${problemSerialNumber} (${problem.title}) by ${submissionUsername}`);

                const newSubmission = new Submission(submissionData);
                const savedSubmission = await newSubmission.save();
                submitUserSubmission(savedSubmission);
                console.log(`[Webhook] Submission created: ${savedSubmission.serialNumber}`);

                console.log(`[Webhook] Submission ${savedSubmission.serialNumber} sent to judger`);
                totalSubmissions++;
            }
        }

        response.status(200).send({
            success: true,
            message: 'Webhook processed successfully',
            commits_processed: payload.commits.length,
            submissions_created: totalSubmissions
        });

    } catch (error: unknown) {
        console.error('[Webhook] Error processing webhook:', error);
        response.status(500).send({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Routes
webhookRouter.post('/api/webhook/gitea', verifyWebhookSecret, checkSchema(giteaWebhookValidation), handleGiteaWebhook);

export default webhookRouter;
