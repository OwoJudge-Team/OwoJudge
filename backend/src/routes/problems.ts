/**
 * Problem management routes.
 *
 * Endpoints for creating, reading, updating, and deleting programming problems,
 * as well as generating test cases and querying allowed languages.
 *
 * @module API/Problems
 */

import { Router, Request, Response } from "express";
import { validationResult, matchedData, checkSchema } from "express-validator";
import { Problem, IProblem, ProblemStatus } from "../mongoose/schemas/problems";
import { updateProblemValidation } from "../validations/update-problem-validation";
import { IUser, UserRole } from "../mongoose/schemas/users";
import { IRequest } from "../utils/request-interface";
import multer from "multer";
import { readFileSync } from "fs";
import * as tar from "tar";
import { spawnSync, exec } from "child_process";
import { promisify } from "util";
import { isTarGz } from "../utils/file-utils";
import { generateSingleTestcase } from "../utils/generate-testcase";
import { IsolateManager } from "../utils/isolate-manager";
import * as fs from "fs";
import * as path from "path";
import { Submission, ISubmission } from "../mongoose/schemas/submission";
import { SubmissionStatus } from "../utils/submission-status";
import { submitUserSubmission } from "../judger/judger";
import { isJudgeAdmin, isTA, isAuthenticated } from "../middleware/auth";

const execAsync = promisify(exec);

// Simple mutex to prevent race conditions on problem directories
class ProblemLock {
  private static locks = new Map<string, Promise<void>>();

  static async acquire(id: string): Promise<() => void> {
    const previousLock = this.locks.get(id) || Promise.resolve();
    let release: () => void = () => { };
    const newLock = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Chain the new lock to the previous one
    // We want the next acquirer to wait for this newLock to resolve
    // Use .catch() to ensure the chain continues even if previousLock rejected
    const nextPromise = previousLock.catch(() => { }).then(() => newLock);

    // Update the map with the promise that resolves when WE are done
    this.locks.set(id, nextPromise);

    // Wait for our turn
    await previousLock.catch(() => { }); // Ignore errors from previous

    return () => {
      release();
      if (this.locks.get(id) === nextPromise) {
        this.locks.delete(id);
      }
    };
  }
}

const problemsRouter = Router();
const userRequestCounts = new Map<string, Map<string, number>>();
const generatedTestcasesPath = "generated_testcases";

// Ensure the base directory for generated testcases exists
if (!fs.existsSync(generatedTestcasesPath)) {
  fs.mkdirSync(generatedTestcasesPath, { recursive: true });
}

// Set up multer directly in the problems router
const storage = multer.diskStorage({
  destination: (
    request: Request,
    file: Express.Multer.File,
    next: (error: Error | null, destination: string) => void,
  ) => {
    next(null, "uploads/");
  },
  filename: (
    request: Request,
    file: Express.Multer.File,
    next: (error: Error | null, filename: string) => void,
  ) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    next(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (request, file, next: any) => {
    if (
      file.mimetype === "application/gzip" ||
      file.originalname.endsWith(".tar.gz")
    ) {
      next(null, true);
    } else {
      next(new Error("Only .tar.gz files are allowed"), false);
    }
  },
}).single("problem");

/**
 * Retrieves a list of all problems.
 * For authenticated users, the remaining daily submission quota is calculated per problem.
 *
 * @route `GET /api/problems`
 * 
 * @authentication
 * - **Released** problems: open to all users.
 * - **Unreleased** problems: open to JudgeAdmins and TAs.
 *
 * @param request - Express request. Authenticated users get quota-adjusted results.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with an array of problem summary objects.
 * - `400 Bad Request` on query error.
 * 
 * @example
 * ##### Response Body
 * ```json
 * [
 *   {
 *     "submissionDetail": {
 *       "accepted": 0,
 *       "submitted": 0,
 *       "timeLimitExceeded": 0,
 *       "memoryLimitExceeded": 0,
 *       "wrongAnswer": 0,
 *       "runtimeError": 0,
 *       "compilationError": 0,
 *       "processLimitExceeded": 0
 *     },
 *     "userDetail": {
 *       "solved": 0,
 *       "attempted": 0
 *     },
 *     "_id": "68fb738f149ff1b7927a14a6",
 *     "serialNumber": 0,
 *     "status": "ready",
 *     "createdTime": "2025-10-24T12:39:43.750Z",
 *     "title": "Problem Title",
 *     "timeLimit": 1,
 *     "memoryLimit": 2048,
 *     "tags": [
 *       "basic"
 *     ],
 *     "problemRelatedTags": [
 *       "math"
 *     ],
 *     "fullScore": 100,
 *     "dailyQuota": 3
 *   }
 * ]
 * ```
 */
const getProblems = async (request: IRequest, response: Response) => {
  try {
    const user = request.user as IUser | undefined;
    const query =
      user && (user.role === UserRole.JudgeAdmin || user.role === UserRole.TA)
        ? {}
        : { released: true };

    const problems: IProblem[] = await Problem.find(query)
      .select(
        "id serialNumber title status createdTime timeLimit memoryLimit tags problemRelatedTags submissionDetail userDetail fullScore dailyQuota released hasGrader",
      )
      .sort({ serialNumber: -1 });

    // Calculate remaining daily quota for the logged-in user
    if (user && user.quotaUsage) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let userModified = false;

      const problemsWithQuota = problems.map((problem) => {
        const problemObj = problem.toObject();
        if (problemObj.dailyQuota && problemObj.dailyQuota > 0) {
          const problemID = problem.id.toString();
          const usage = user.quotaUsage.get(problemID);
          if (usage) {
            if (usage.date < today) {
              user.quotaUsage.set(problemID, { count: 0, date: today });
              userModified = true;
            } else {
              problemObj.dailyQuota = Math.max(
                0,
                problemObj.dailyQuota - usage.count,
              );
            }
          }
        }
        return problemObj;
      });

      if (userModified) {
        await user.save();
      }

      response.status(200).send(problemsWithQuota);
    } else {
      response.status(200).send(problems);
    }
  } catch (error) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

/**
 * Retrieves a single problem by its serial number, including its description
 * and sample test cases read from the file system.
 *
 * @route `GET /api/problems/:serialNumber`
 * @authentication Required.
 * - **Released** problems: open to all users.
 * - **Unreleased** problems: open to JudgeAdmins and TAs.
 * 
 * @param request - Express request with `serialNumber` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the full problem object (description, sample test cases, quota).
 * - `400 Bad Request` if the serial number is invalid.
 * - `404 Not Found` if the problem does not exist or is unreleased for non-admins.
 * 
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "submissionDetail": {
 *     "accepted": 0,
 *     "submitted": 0,
 *     "timeLimitExceeded": 0,
 *     "memoryLimitExceeded": 0,
 *     "wrongAnswer": 0,
 *     "runtimeError": 0,
 *     "compilationError": 0,
 *     "processLimitExceeded": 0
 *   },
 *   "userDetail": {
 *     "solved": 0,
 *     "attempted": 0
 *   },
 *   "_id": "68fb738f149ff1b7927a14a6",
 *   "serialNumber": 0,
 *   "status": "ready",
 *   "createdTime": "2025-10-24T12:39:43.750Z",
 *   "title": "Problem Title",
 *   "timeLimit": 1,
 *   "memoryLimit": 2048,
 *   "processes": 1,
 *   "fullScore": 100,
 *   "scorePolicy": "sum",
 *   "tags": [
 *     "basic"
 *   ],
 *   "problemRelatedTags": [
 *     "math"
 *   ],
 *   "dailyQuota": 3,
 *   "__v": 0,
 *   "description": "# TPS example problem (a + b)\n\n## Story\n\n...",
 *   "sampleTestcases": [
 *     {
 *       "name": "0-01",
 *       "input": "1 2\n",
 *       "output": "3\n"
 *     }
 *   ]
 * }
 * ```
 */
const getProblemByID = async (request: IRequest, response: Response) => {
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send("Invalid problem ID");
    return;
  }

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const user = request.user as IUser | undefined;
    if (
      !problem.released &&
      (!user ||
        (user.role !== UserRole.JudgeAdmin && user.role !== UserRole.TA))
    ) {
      response.sendStatus(404);
      return;
    }

    const problemDir = "problems/" + serialNumber;

    try {
      // Read sample testcases from tests/mapping file
      const sampleTestcases: any[] = [];
      const testsDir = path.join(problemDir, "tests");
      const mappingPath = path.join(testsDir, "mapping");

      if (fs.existsSync(mappingPath)) {
        const mappingContent = fs.readFileSync(mappingPath, "utf-8");
        const sampleTestcaseNames: string[] = [];

        // Parse mapping file to find sample subtask testcases
        for (const line of mappingContent.split("\n")) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const parts = trimmedLine.split(/\s+/);
          if (parts.length < 2) continue;

          const subtaskName = parts[0];
          const testcaseName = parts[1];

          // Check if this belongs to sample subtask
          if (subtaskName === "sample" || subtaskName.includes("sample")) {
            sampleTestcaseNames.push(testcaseName);
          }
        }

        // Read actual test case files
        for (const testcaseName of sampleTestcaseNames) {
          const inputPath = path.join(testsDir, `${testcaseName}.in`);
          const outputPath = path.join(testsDir, `${testcaseName}.out`);

          if (fs.existsSync(inputPath) && fs.existsSync(outputPath)) {
            sampleTestcases.push({
              name: testcaseName,
              input: fs.readFileSync(inputPath, "utf-8"),
              output: fs.readFileSync(outputPath, "utf-8"),
            });
          }
        }
      }

      const description = readFileSync(
        `${problemDir}/statement/description.md`,
        "utf8",
      );

      const fullProblem = {
        ...problem.toObject(),
        description: description,
        sampleTestcases: sampleTestcases || [],
      };

      // Calculate remaining daily quota for the logged-in user
      const user = request.user as IUser;
      if (
        user &&
        user.quotaUsage &&
        fullProblem.dailyQuota &&
        fullProblem.dailyQuota > 0
      ) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const problemID = problem.id.toString();
        const usage = user.quotaUsage.get(problemID);

        if (usage) {
          if (usage.date < today) {
            user.quotaUsage.set(problemID, { count: 0, date: today });
            await user.save();
          } else {
            fullProblem.dailyQuota = Math.max(
              0,
              fullProblem.dailyQuota - usage.count,
            );
          }
        }
      }

      response.status(200).send(fullProblem);
    } catch (metadataErr) {
      console.error("Error reading metadata:", metadataErr);
      response.status(200).send(problem);
    }
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};

/**
 * Creates a new problem by uploading a `.tar.gz` file containing the problem data
 * (metadata, statement, checker, optional grader, optional generator). You can see
 * docs/example/tps-example.
 *
 * Test case generation via `tps gen` runs asynchronously in an isolated sandbox
 * after the response is sent. The problem status starts as `waiting` and becomes
 * `ready` (or `error`) once generation completes.
 *
 * @route `POST /api/problems`
 * @authentication Only for TAs and JudgeAdmins.
 *
 * @param request - Express request with a `multipart/form-data` file field named `problem`.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` with the new problem object.
 * - `400 Bad Request` if the file is missing, not `.tar.gz`, or metadata is invalid.
 * - `403 Forbidden` if a problem with the same filename already exists.
 * 
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb738f149ff1b7927a14a6",
 *   "serialNumber": 0,
 *   "title": "Problem Title",
 *   "status": "waiting",
 *   "createdTime": "2025-10-24T12:39:43.750Z",
 *   "timeLimit": 1,
 *   "memoryLimit": 2048,
 *   "tags": ["basic"],
 *   "problemRelatedTags": ["math"]
 * }
 * ```
 */
const createProblem = async (
  request: IRequest,
  response: Response,
): Promise<void> => {
  console.log("[create-problem] Received request to create problem with file upload");
  const filePath = request.file?.path;
  if (!filePath) {
    response.status(400).send("No file uploaded");
    return;
  }

  const file = readFileSync(filePath as string);
  if (!isTarGz(file)) {
    response.status(400).send("Invalid file format. Expected tar.gz file.");
    return;
  }

  const fileName = (filePath as string).split("/").reverse()[0];
  const targetPath = "problems/" + fileName;
  try {
    // Check if problem with same fileName exists (unlikely with unique filenames, but good for sanity)
    const problem = await Problem.findOne({ fileName });
    if (problem) {
      response.status(403).send("Problem with this filename already exists");
      return;
    }

    spawnSync("mv", [filePath as string, targetPath]);

    const stats = fs.statSync(targetPath);

    // Create a directory for this specific upload to avoid conflicts
    const extractDir = "problems/" + fileName.replace(".tar.gz", "");
    fs.mkdirSync(extractDir, { recursive: true });

    await tar.x({
      file: targetPath,
      cwd: extractDir,
      strip: 1, // Strip the top-level directory from the tarball
      noMtime: true,
    });

    const problemDir = extractDir;
    // Cleanup macOS metadata files that might cause issues with cp
    spawnSync("find", [problemDir, "-name", "._*", "-delete"]);

    const metadataPath = `${problemDir}/problem.json`;
    const judgeMetaPath = `${problemDir}/judgemeta.json`;
    try {
      const metadataContent = readFileSync(metadataPath, "utf8");
      const metadata = JSON.parse(metadataContent);

      if (metadata.has_grader !== undefined) {
        const graderPath = path.join(problemDir, "grader");
        const hasGraderDir =
          fs.existsSync(graderPath) && fs.statSync(graderPath).isDirectory();
        if (!!metadata.has_grader !== hasGraderDir) {
          fs.rmSync(problemDir, { recursive: true, force: true });
          spawnSync("rm", ["-f", targetPath]);
          response
            .status(400)
            .send(
              `Metadata has_grader (${metadata.has_grader}) does not match problem structure (grader directory exists: ${hasGraderDir})`,
            );
          return;
        }
      }

      let judgeMeta: any = {};
      try {
        if (fs.existsSync(judgeMetaPath)) {
          const judgeMetaContent = readFileSync(judgeMetaPath, "utf8");
          judgeMeta = JSON.parse(judgeMetaContent);
        }
      } catch (err) {
        console.error("[create-problem] Error reading judgemeta.json:", err);
      }

      let newProblem: IProblem;
      try {
        newProblem = new Problem({
          hasGrader:
            fs.existsSync(path.join(problemDir, "grader")) &&
            fs.statSync(path.join(problemDir, "grader")).isDirectory(),
          createdTime: metadata.createdTime || new Date(),
          title: metadata.title,
          fileName: fileName,
          timeLimit: metadata.time_limit,
          memoryLimit: metadata.memory_limit,
          scorePolicy: metadata.score_policy,
          fullScore: judgeMeta.full_score ?? metadata.full_score,
          dailyQuota: judgeMeta.dailyQuota ?? metadata.dailyQuota,
          processes: judgeMeta.process_limit ?? 1,
          tags: judgeMeta.tags || metadata.tags || [],
          testcase: metadata.testcase,
          problemRelatedTags:
            judgeMeta.problemRelatedTags || metadata.problemRelatedTags || [],
          submissionDetail: {
            accepted: metadata.submissionDetail?.accepted || 0,
            submitted: metadata.submissionDetail?.submitted || 0,
            timeLimitExceeded:
              metadata.submissionDetail?.timeLimitExceeded || 0,
            memoryLimitExceeded:
              metadata.submissionDetail?.memoryLimitExceeded || 0,
            wrongAnswer: metadata.submissionDetail?.wrongAnswer || 0,
            runtimeError: metadata.submissionDetail?.runtimeError || 0,
            compilationError: metadata.submissionDetail?.compilationError || 0,
            processLimitExceeded:
              metadata.submissionDetail?.processLimitExceeded || 0,
          },
          userDetail: {
            solved: metadata.userDetail?.solved || 0,
            attempted: metadata.userDetail?.attempted || 0,
          },
        });
        await newProblem.save();
      } catch (dupError) {
        console.error("Error creating problem:", dupError);
        // Cleanup extracted files on error
        fs.rmSync(problemDir, { recursive: true, force: true });
        response.status(403).send(`Error creating problem: ${dupError}`);
        return;
      }

      // Move extracted directory to final location
      const finalProblemDir = "problems/" + newProblem.serialNumber;

      // Acquire lock for this problem ID to prevent race conditions
      const releaseLock = await ProblemLock.acquire(
        newProblem.serialNumber.toString(),
      );

      try {
        if (fs.existsSync(finalProblemDir)) {
          fs.rmSync(finalProblemDir, { recursive: true, force: true });
        }
        fs.renameSync(problemDir, finalProblemDir);

        console.log(`Problem ${newProblem.serialNumber} saved to database`);

        // Generate test cases asynchronously using tps gen in isolated environment
        // This runs in the background and doesn't block the response
        // We keep the lock held during this process to prevent other requests from modifying the directory
        (async () => {
          try {
            console.log(
              `Starting async test generation for ${newProblem.serialNumber} in isolated environment`,
            );

            await IsolateManager.withBox(async (box) => {
              const genBoxDir = box.getBoxDir();
              const workDir = path.join(
                "judging",
                "tps-gen-" + newProblem.serialNumber,
              );

              // Ensure work directory exists
              fs.mkdirSync(workDir, { recursive: true });

              try {
                // Copy entire problem directory to isolated box
                await box.copyToBox(finalProblemDir);

                const genMetaFile = path.join(workDir, "tps-gen.meta");

                // Run tps gen inside isolate with generous limits
                await box.run(
                  "/usr/local/bin/tps gen",
                  {
                    processes: 50,
                    timeLimit: 600,
                    wallTimeLimit: 3600,
                    memoryLimit: 2048000,
                    metaFile: genMetaFile,
                    stderr: "tps-gen.error",
                    fullEnv: true,
                    dirs: [
                      "/usr",
                      "/bin",
                      "/lib",
                      "/etc",
                      ...(fs.existsSync("/lib64") ? ["/lib64"] : []),
                    ],
                    cwd: "/box",
                  },
                  4000000,
                );

                // Copy generated tests directory back to problem directory
                const generatedTestsDir = path.join(genBoxDir, "tests");
                const targetTestsDir = path.join(finalProblemDir, "tests");
                const tempTestsDir = path.join(
                  finalProblemDir,
                  "tests.tmp-" + Date.now(),
                );

                if (fs.existsSync(generatedTestsDir)) {
                  // First copy to a temporary directory to ensure atomic replacement
                  try {
                    await fs.promises.cp(generatedTestsDir, tempTestsDir, {
                      recursive: true,
                    });

                    // Ensure parent directory exists and is writable
                    if (fs.existsSync(finalProblemDir)) {
                      try {
                        fs.chmodSync(finalProblemDir, 0o755);
                      } catch (e) {
                        console.warn(`Failed to chmod ${finalProblemDir}:`, e);
                      }
                    } else {
                      fs.mkdirSync(finalProblemDir, { recursive: true });
                    }

                    // Remove old tests directory and replace with new one atomically
                    if (fs.existsSync(targetTestsDir)) {
                      fs.rmSync(targetTestsDir, { recursive: true, force: true });
                    }
                    fs.renameSync(tempTestsDir, targetTestsDir);

                    console.log(
                      `Test cases generated and copied successfully for ${newProblem.serialNumber}`,
                    );

                    // Validate that on-demand generation works by running the first
                    // non-manual testcase through generateSingleTestcase (compiles
                    // the generator and the model solution end-to-end).
                    const genSummaryCandidates = [
                      path.join(finalProblemDir, "tests", "gen_summary"),
                      path.join(finalProblemDir, "gen", "gen_summary"),
                    ];
                    let firstTestcase: string | null = null;
                    for (const genSummaryPath of genSummaryCandidates) {
                      if (!fs.existsSync(genSummaryPath)) continue;
                      for (const line of fs
                        .readFileSync(genSummaryPath, "utf8")
                        .split("\n")) {
                        if (!line.trim() || line.trim().startsWith("#")) continue;
                        const parts = line.trim().split(/\s+/);
                        if (
                          parts.length >= 3 &&
                          !parts.slice(2).join(" ").startsWith("manual")
                        ) {
                          firstTestcase = parts[0];
                          break;
                        }
                      }
                      if (firstTestcase) break;
                    }
                    if (firstTestcase) {
                      console.log(
                        `Validating on-demand generation for problem ${newProblem.serialNumber}, testcase ${firstTestcase}`,
                      );
                      await generateSingleTestcase(newProblem.serialNumber.toString(), firstTestcase);
                    } else {
                      console.warn('No gen available for this problem');
                    }

                    // Verify checker compilation in a fresh isolated box containing
                    // only the checker/ directory — the same environment the judger
                    // uses — so stale binaries or testlib.h leaking from the problem
                    // root cannot mask a broken checker.
                    const checkerDir = path.join(finalProblemDir, "checker");
                    if (!fs.existsSync(checkerDir)) {
                      throw new Error(`Checker directory not found for problem ${newProblem.serialNumber}`);
                    }
                    console.log(`Verifying checker compilation for problem ${newProblem.serialNumber}...`);
                    await IsolateManager.withBox(async (checkerBox) => {
                      const checkerBoxDir = checkerBox.getBoxDir();
                      await checkerBox.copyToBox(checkerDir);
                      // Remove any pre-compiled binary that may have been bundled with the
                      // problem package — otherwise a stale checker.exe would mask a broken
                      // Makefile and the existence check below would incorrectly pass.
                      const prebuiltChecker = path.join(checkerBoxDir, 'checker.exe');
                      if (fs.existsSync(prebuiltChecker)) {
                        fs.rmSync(prebuiltChecker);
                      }
                      try {
                        await checkerBox.run('make', {
                          processes: 20,
                          timeLimit: 10,
                          wallTimeLimit: 20,
                          memoryLimit: 512000,
                          stderr: 'checker-compile.error',
                          fullEnv: true,
                          dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])]
                        }, 25000);
                      } catch {
                        // make failed; existence check below produces the real error
                      }
                      const compiledCheckerPath = path.join(checkerBoxDir, 'checker.exe');
                      if (!fs.existsSync(compiledCheckerPath)) {
                        let errorMsg = `Checker compilation failed for problem ${newProblem.serialNumber}`;
                        const errorFilePath = path.join(checkerBoxDir, 'checker-compile.error');
                        if (fs.existsSync(errorFilePath)) {
                          errorMsg += `\nError:\n${fs.readFileSync(errorFilePath, 'utf-8')}`;
                        }
                        throw new Error(errorMsg);
                      }

                      // Verify checker runtime by running it against the first available test case.
                      // We use the judge's answer as the user's output, so a correct checker should return score 1.
                      const testFiles = fs.readdirSync(targetTestsDir).filter(f => f.endsWith('.in')).sort();
                      if (testFiles.length > 0) {
                        const testBase = testFiles[0].slice(0, -3);
                        console.log(`Verifying checker runtime for problem ${newProblem.serialNumber} with testcase ${testBase}...`);
                        fs.copyFileSync(path.join(targetTestsDir, `${testBase}.in`), path.join(checkerBoxDir, 'input.in'));
                        fs.copyFileSync(path.join(targetTestsDir, `${testBase}.out`), path.join(checkerBoxDir, 'answer.out'));
                        fs.copyFileSync(path.join(targetTestsDir, `${testBase}.out`), path.join(checkerBoxDir, 'user.out'));

                        try {
                          await checkerBox.run('./checker.exe input.in answer.out user.out', {
                            processes: 1,
                            timeLimit: 10,
                            wallTimeLimit: 20,
                            memoryLimit: 512000,
                            stdout: 'checker-runtime.out',
                            stderr: 'checker-runtime.err',
                            dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])]
                          }, 25000);
                        } catch {
                          let errorMsg = `Checker runtime failed for problem ${newProblem.serialNumber}.`;
                          const stderrPath = path.join(checkerBoxDir, 'checker-runtime.err');
                          if (fs.existsSync(stderrPath)) {
                            errorMsg += `\nError:\n${fs.readFileSync(stderrPath, 'utf-8')}`;
                          }
                          throw new Error(errorMsg);
                        }

                        const scoreStr = fs.readFileSync(path.join(checkerBoxDir, 'checker-runtime.out'), 'utf-8').trim();
                        if (isNaN(parseFloat(scoreStr))) {
                          throw new Error(`Checker produced non-numeric output for problem ${newProblem.serialNumber}: "${scoreStr}"`);
                        }
                        console.log(`Checker runtime verified successfully for problem ${newProblem.serialNumber} (score: ${scoreStr})`);
                      }
                    });

                    // Update problem status to Ready
                    console.log(`Problem ${newProblem.serialNumber} checker verified, setting status to Ready`);
                    await Problem.findByIdAndUpdate(newProblem._id, {
                      status: ProblemStatus.Ready,
                      statusReason: 'Checker compiled and verified successfully',
                    });
                  } catch (copyError) {
                    // Clean up temporary directory if copy failed
                    if (fs.existsSync(tempTestsDir)) {
                      fs.rmSync(tempTestsDir, { recursive: true, force: true });
                    }
                    throw copyError;
                  }
                } else {
                  throw new Error("Tests directory not generated by tps gen");
                }
              } finally {
                // Clean up work directory
                if (fs.existsSync(workDir)) {
                  fs.rmSync(workDir, { recursive: true, force: true });
                }
              }
            });
          } catch (genError) {
            const reason = genError instanceof Error ? genError.message : String(genError);
            console.error(
              `Problem ${newProblem.serialNumber} failed in tps validateion process:`,
              reason,
            );
            await Problem.findByIdAndUpdate(newProblem._id, {
              status: ProblemStatus.Error,
              statusReason: reason,
            });
          } finally {
            releaseLock();
          }
        })();
      } catch (error) {
        releaseLock();
        throw error;
      }

      response.status(201).json(newProblem);
      return;
    } catch (error) {
      console.error("[create-problem] Error:", error);
      // Cleanup extracted files on error
      if (fs.existsSync(problemDir)) {
        fs.rmSync(problemDir, { recursive: true, force: true });
      }
      throw error;
    }
  } catch (error) {
    const problemDir = "problems/" + fileName.replace(".tar.gz", "");
    const tarFilePath = "problems/" + fileName;
    try {
      if (problemDir.indexOf("..") !== -1 || tarFilePath.indexOf("..") !== -1) {
        throw new Error("Invalid file path");
      }
      spawnSync("rm", ["-rf", problemDir]);
      spawnSync("rm", ["-f", tarFilePath]);
    } catch (fsError) {
      console.error("Error deleting problem files:", fsError);
    }
    response.status(400).send("Error extracting file");
    return;
  }
};

/**
 * Deletes a problem and its associated files from the file system and database.
 *
 * @route `DELETE /api/problems/:serialNumber`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request with `serialNumber` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` with the deleted problem object.
 * - `400 Bad Request` if the serial number is invalid.
 * - `401 Unauthorized` if the user is not a Judge Admin.
 * - `404 Not Found` if the problem does not exist.
 * 
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "serialNumber": 0,
 *   "title": "Problem Title",
 *   "status": "ready"
 * }
 * ```
 */
const deleteProblem = async (request: IRequest, response: Response) => {
  const user = request.user as IUser;
  if (
    !request.isAuthenticated() ||
    !request.user ||
    user.role !== UserRole.JudgeAdmin
  ) {
    response.status(401).send("Please login as a Judge Admin first");
    return;
  }
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send("Invalid problem ID");
    return;
  }

  // Acquire lock to ensure no other operations (like async test generation) are running
  const releaseLock = await ProblemLock.acquire(serialNumber.toString());

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const fileName = problem.serialNumber.toString();
    const problemDir = "problems/" + fileName;
    const tarFilePath = "problems/" + problem.fileName; // Use stored fileName for tarball

    try {
      if (problemDir.indexOf("..") !== -1 || tarFilePath.indexOf("..") !== -1) {
        throw new Error("Invalid file path");
      }
      spawnSync("rm", ["-rf", problemDir]);
      spawnSync("rm", ["-f", tarFilePath]);
    } catch (fsError) {
      console.error("Error deleting problem files:", fsError);
    }
    await Problem.findOneAndDelete({ serialNumber });
    response.status(201).send(problem);
  } catch (error) {
    response.status(400).send(error);
  } finally {
    releaseLock();
  }
};

/**
 * Updates specific metadata fields of a problem without re-uploading the archive.
 *
 * @route `PATCH /api/problems/:serialNumber`
 * @authentication Only for TAs and JudgeAdmins.
 *
 * @param request - Express request with `serialNumber` route parameter and
 *   partial problem fields in the body.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` with the updated problem summary.
 * - `400 Bad Request` if the serial number is invalid or no valid fields provided.
 * - `404 Not Found` if the problem does not exist.
 * 
 * @example
 * ##### Request Body
 * Partial `IProblem` object.
 *
 * ##### Response Body
 * ```json
 * {
 *   "serialNumber": 0,
 *   "title": "Updated Problem Title",
 *   "createdTime": "2025-10-24T12:39:43.750Z"
 * }
 * ```
 */
const updateProblem = async (request: IRequest, response: Response) => {
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send("Invalid problem ID");
    return;
  }

  const data = matchedData(request);
  try {
    if (Object.keys(data).length === 2) {
      throw {
        message: "No matched patch data",
        error: validationResult(request).array(),
      };
    }
    let problem: IProblem | null = await Problem.findOneAndUpdate(
      { serialNumber },
      data,
    );
    if (!problem) {
      response.sendStatus(404);
      return;
    }
    problem = await Problem.findOne({ serialNumber }).select(
      "serialNumber title createdTime",
    );
    response.status(201).send(problem);
  } catch (error) {
    console.error(`[update-problem] unknown: ${error}`);
    response.status(400).send(error);
  }
};

/**
 * Updates an existing problem by uploading a new `.tar.gz` archive.
 * Replaces the problem files on disk and re-runs test case generation
 * asynchronously in an isolated sandbox.
 *
 * @route `PUT /api/problems/:serialNumber`
 * @authentication Only for TAs and JudgeAdmins.
 *
 * @param request - Express request with `serialNumber` route parameter and
 *   a `multipart/form-data` file field named `problem`.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` on success.
 * - `400 Bad Request` if the file is missing, not `.tar.gz`, or metadata is invalid.
 * - `404 Not Found` if the problem does not exist.
 */
const updateProblemWithFile = async (
  request: IRequest,
  response: Response,
): Promise<void> => {
  console.log(`[update-problem-with-file] Updating problem with serial number: ${request.params.serialNumber}`);
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send("Invalid problem ID");
    return;
  }

  const filePath = request.file?.path;
  if (!filePath) {
    response.status(400).send("No file uploaded");
    return;
  }

  const file = readFileSync(filePath);
  if (!isTarGz(file)) {
    response.status(400).send("Invalid file format. Expected tar.gz file.");
    return;
  }

  const fileName = (filePath as string).split("/").reverse()[0];
  const targetPath = "problems/" + fileName;
  // Use a temp dir name that can never collide with the problem's serial-number
  // directory (e.g. if the user uploads "1001.tar.gz" for problem 1001, the
  // old extraction scheme would create problems/1001, which is the same as
  // the existing problem dir — causing it to be wiped before the rename).
  const newProblemDir = "problems/update-" + serialNumber + "-" + Date.now();

  try {
    const existingProblem: IProblem | null = await Problem.findOne({
      serialNumber,
    });
    if (!existingProblem) {
      spawnSync("rm", ["-f", filePath]);
      response.status(404).send("Problem not found");
      return;
    }

    spawnSync("mv", [filePath, targetPath]);

    const extractDir = newProblemDir;
    fs.mkdirSync(extractDir, { recursive: true });

    await tar.x({
      file: targetPath,
      cwd: extractDir,
      strip: 1,
      noMtime: true,
    });

    // Cleanup macOS metadata files that might cause issues with cp
    spawnSync("find", [newProblemDir, "-name", "._*", "-delete"]);

    const metadataPath = `${newProblemDir}/problem.json`;
    const judgeMetaPath = `${newProblemDir}/judgemeta.json`;
    try {
      const metadataContent = readFileSync(metadataPath, "utf8");
      const metadata = JSON.parse(metadataContent);

      if (metadata.has_grader !== undefined) {
        const graderPath = path.join(newProblemDir, "grader");
        const hasGraderDir =
          fs.existsSync(graderPath) && fs.statSync(graderPath).isDirectory();
        if (!!metadata.has_grader !== hasGraderDir) {
          fs.rmSync(newProblemDir, { recursive: true, force: true });
          spawnSync("rm", ["-f", targetPath]);
          response
            .status(400)
            .send(
              `Metadata has_grader (${metadata.has_grader}) does not match problem structure (grader directory exists: ${hasGraderDir})`,
            );
          return;
        }
      }

      let judgeMeta: any = {};
      try {
        if (fs.existsSync(judgeMetaPath)) {
          const judgeMetaContent = readFileSync(judgeMetaPath, "utf8");
          judgeMeta = JSON.parse(judgeMetaContent);
        }
      } catch (err) {
        console.warn("Error reading judgemeta.json:", err);
      }

      // Clean up old files
      const oldProblemDir = "problems/" + existingProblem.serialNumber;
      const oldTarFilePath = "problems/" + existingProblem.fileName;
      const problemsBaseDir = path.resolve("problems");
      const resolvedOldProblemDir = path.resolve(oldProblemDir);
      const resolvedOldTarFilePath = path.resolve(oldTarFilePath);
      if (
        resolvedOldProblemDir.startsWith(problemsBaseDir + path.sep) &&
        resolvedOldTarFilePath.startsWith(problemsBaseDir + path.sep)
      ) {
        spawnSync("rm", ["-rf", oldProblemDir]);
        spawnSync("rm", ["-f", oldTarFilePath]);
      }

      // Move new dir to final location
      const finalProblemDir = "problems/" + serialNumber;

      // Acquire lock for this problem ID
      const releaseLock = await ProblemLock.acquire(serialNumber.toString());

      try {
        if (fs.existsSync(finalProblemDir)) {
          fs.rmSync(finalProblemDir, { recursive: true, force: true });
        }

        // Ensure parent directory exists (should be 'problems/')
        const parentDir = path.dirname(finalProblemDir);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.renameSync(newProblemDir, finalProblemDir);

        const updateData = {
          hasGrader:
            fs.existsSync(path.join(finalProblemDir, "grader")) &&
            fs.statSync(path.join(finalProblemDir, "grader")).isDirectory(),
          createdTime: metadata.createdTime || new Date(),
          title: metadata.title,
          fileName: fileName,
          timeLimit: metadata.time_limit,
          memoryLimit: metadata.memory_limit,
          scorePolicy: metadata.score_policy,
          fullScore: judgeMeta.full_score ?? metadata.full_score,
          dailyQuota: judgeMeta.dailyQuota ?? metadata.dailyQuota,
          processes: judgeMeta.process_limit ?? 1,
          tags: judgeMeta.tags || metadata.tags || [],
          testcase: metadata.testcase,
          problemRelatedTags:
            judgeMeta.problemRelatedTags || metadata.problemRelatedTags || [],
          submissionDetail: {
            ...existingProblem.submissionDetail,
            ...(metadata.submissionDetail || {}),
          },
          userDetail: {
            ...existingProblem.userDetail,
            ...(metadata.userDetail || {}),
          },
          status: ProblemStatus.Waiting,
        };

        await Problem.findByIdAndUpdate(existingProblem._id, updateData, {
          new: true,
          runValidators: true,
        });

        // Generate test cases asynchronously using tps gen in isolated environment
        // This runs in the background and doesn't block the response
        (async () => {
          try {
            console.log(
              `Starting async test generation for ${serialNumber} in isolated environment`,
            );

            await IsolateManager.withBox(async (box) => {
              const genBoxDir = box.getBoxDir();
              const workDir = path.join("judging", "tps-gen-" + serialNumber);

              // Ensure work directory exists
              fs.mkdirSync(workDir, { recursive: true });

              try {
                // Copy entire problem directory to isolated box
                await box.copyToBox(finalProblemDir);

                const genMetaFile = path.join(workDir, "tps-gen.meta");

                // Run tps gen inside isolate with generous limits
                await box.run(
                  "/usr/local/bin/tps gen",
                  {
                    processes: 50,
                    timeLimit: 600,
                    wallTimeLimit: 3600,
                    memoryLimit: 2048000,
                    metaFile: genMetaFile,
                    stderr: "tps-gen.error",
                    fullEnv: true,
                    dirs: [
                      "/usr",
                      "/bin",
                      "/lib",
                      "/etc",
                      ...(fs.existsSync("/lib64") ? ["/lib64"] : []),
                    ],
                    cwd: "/box",
                  },
                  4000000,
                );

                // Copy generated tests directory back to problem directory
                const generatedTestsDir = path.join(genBoxDir, "tests");
                const targetTestsDir = path.join(finalProblemDir, "tests");
                const tempTestsDir = path.join(
                  finalProblemDir,
                  "tests.tmp-" + Date.now(),
                );

                if (fs.existsSync(generatedTestsDir)) {
                  // First copy to a temporary directory to ensure atomic replacement
                  try {
                    await fs.promises.cp(generatedTestsDir, tempTestsDir, {
                      recursive: true,
                    });

                    // Ensure parent directory exists and is writable
                    if (fs.existsSync(finalProblemDir)) {
                      try {
                        fs.chmodSync(finalProblemDir, 0o755);
                      } catch (e) {
                        console.warn(`Failed to chmod ${finalProblemDir}:`, e);
                      }
                    } else {
                      fs.mkdirSync(finalProblemDir, { recursive: true });
                    }

                    // Remove old tests directory and replace with new one atomically
                    if (fs.existsSync(targetTestsDir)) {
                      fs.rmSync(targetTestsDir, { recursive: true, force: true });
                    }
                    fs.renameSync(tempTestsDir, targetTestsDir);

                    console.log(
                      `Test cases generated and copied successfully for ${serialNumber}`,
                    );

                    // Validate that on-demand generation works by running the first
                    // non-manual testcase through generateSingleTestcase (compiles
                    // the generator and the model solution end-to-end).
                    const genSummaryCandidates = [
                      path.join(finalProblemDir, "tests", "gen_summary"),
                      path.join(finalProblemDir, "gen", "gen_summary"),
                    ];
                    let firstTestcase: string | null = null;
                    for (const genSummaryPath of genSummaryCandidates) {
                      if (!fs.existsSync(genSummaryPath)) continue;
                      for (const line of fs
                        .readFileSync(genSummaryPath, "utf8")
                        .split("\n")) {
                        if (!line.trim() || line.trim().startsWith("#")) continue;
                        const parts = line.trim().split(/\s+/);
                        if (
                          parts.length >= 3 &&
                          !parts.slice(2).join(" ").startsWith("manual")
                        ) {
                          firstTestcase = parts[0];
                          break;
                        }
                      }
                      if (firstTestcase) break;
                    }
                    if (firstTestcase) {
                      console.log(
                        `Validating on-demand generation for problem ${existingProblem.serialNumber}, testcase ${firstTestcase}`,
                      );
                      await generateSingleTestcase(existingProblem.serialNumber.toString(), firstTestcase);
                    } else {
                      console.warn('No gen available for this problem');
                    }

                    // Verify checker compilation in a fresh isolated box containing
                    // only the checker/ directory — the same environment the judger
                    // uses — so stale binaries or testlib.h leaking from the problem
                    // root cannot mask a broken checker.
                    const checkerDir = path.join(finalProblemDir, "checker");
                    if (!fs.existsSync(checkerDir)) {
                      throw new Error(`Checker directory not found for problem ${existingProblem.serialNumber}`);
                    }
                    console.log(`Verifying checker compilation for problem ${existingProblem.serialNumber}...`);
                    await IsolateManager.withBox(async (checkerBox) => {
                      const checkerBoxDir = checkerBox.getBoxDir();
                      await checkerBox.copyToBox(checkerDir);
                      // Remove any pre-compiled binary that may have been bundled with the
                      // problem package — otherwise a stale checker.exe would mask a broken
                      // Makefile and the existence check below would incorrectly pass.
                      const prebuiltChecker = path.join(checkerBoxDir, 'checker.exe');
                      if (fs.existsSync(prebuiltChecker)) {
                        fs.rmSync(prebuiltChecker);
                      }
                      try {
                        await checkerBox.run('make', {
                          processes: 20,
                          timeLimit: 10,
                          wallTimeLimit: 20,
                          memoryLimit: 512000,
                          stderr: 'checker-compile.error',
                          fullEnv: true,
                          dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])]
                        }, 25000);
                      } catch {
                        // make failed; existence check below produces the real error
                      }
                      const compiledCheckerPath = path.join(checkerBoxDir, 'checker.exe');
                      if (!fs.existsSync(compiledCheckerPath)) {
                        let errorMsg = `Checker compilation failed for problem ${existingProblem.serialNumber}, checker.exe not found.`;
                        const errorFilePath = path.join(checkerBoxDir, 'checker-compile.error');
                        if (fs.existsSync(errorFilePath)) {
                          errorMsg += `\nError:\n${fs.readFileSync(errorFilePath, 'utf-8')}`;
                        }
                        throw new Error(errorMsg);
                      }

                      // Verify checker runtime by running it against the first available test case.
                      // We use the judge's answer as the user's output, so a correct checker should return score 1.
                      const testFiles = fs.readdirSync(targetTestsDir).filter(f => f.endsWith('.in')).sort();
                      if (testFiles.length > 0) {
                        const testBase = testFiles[0].slice(0, -3);
                        console.log(`Verifying checker runtime for problem ${existingProblem.serialNumber} with testcase ${testBase}...`);
                        fs.copyFileSync(path.join(targetTestsDir, `${testBase}.in`), path.join(checkerBoxDir, 'input.in'));
                        fs.copyFileSync(path.join(targetTestsDir, `${testBase}.out`), path.join(checkerBoxDir, 'answer.out'));
                        fs.copyFileSync(path.join(targetTestsDir, `${testBase}.out`), path.join(checkerBoxDir, 'user.out'));

                        try {
                          await checkerBox.run('./checker.exe input.in answer.out user.out', {
                            processes: 1,
                            timeLimit: 10,
                            wallTimeLimit: 20,
                            memoryLimit: 512000,
                            stdout: 'checker-runtime.out',
                            stderr: 'checker-runtime.err',
                            dirs: ['/usr', '/bin', '/lib', '/etc', ...(fs.existsSync('/lib64') ? ['/lib64'] : [])]
                          }, 25000);
                        } catch {
                          let errorMsg = `Checker runtime failed for problem ${existingProblem.serialNumber}.`;
                          const stderrPath = path.join(checkerBoxDir, 'checker-runtime.err');
                          if (fs.existsSync(stderrPath)) {
                            errorMsg += `\nError:\n${fs.readFileSync(stderrPath, 'utf-8')}`;
                          }
                          throw new Error(errorMsg);
                        }

                        const scoreStr = fs.readFileSync(path.join(checkerBoxDir, 'checker-runtime.out'), 'utf-8').trim();
                        if (isNaN(parseFloat(scoreStr))) {
                          throw new Error(`Checker produced non-numeric output for problem ${existingProblem.serialNumber}: "${scoreStr}"`);
                        }
                        console.log(`Checker runtime verified successfully for problem ${existingProblem.serialNumber} (score: ${scoreStr})`);
                      }
                    });

                    // Update problem status to Ready
                    console.log(`Problem ${existingProblem.serialNumber} checker verified, setting status to Ready`);
                    await Problem.findByIdAndUpdate(existingProblem._id, {
                      status: ProblemStatus.Ready,
                      statusReason: 'Checker compiled and verified successfully',
                    });
                  } catch (copyError) {
                    // Clean up temporary directory if copy failed
                    if (fs.existsSync(tempTestsDir)) {
                      fs.rmSync(tempTestsDir, { recursive: true, force: true });
                    }
                    throw copyError;
                  }
                } else {
                  throw new Error("Tests directory not generated by tps gen");
                }
              } finally {
                // Clean up work directory
                if (fs.existsSync(workDir)) {
                  fs.rmSync(workDir, { recursive: true, force: true });
                }
              }
            });
          } catch (genError) {
            const reason = genError instanceof Error ? genError.message : String(genError);
            console.error(
              `Failed to generate test cases for ${serialNumber}:`,
              genError,
            );
            await Problem.findByIdAndUpdate(existingProblem._id, {
              status: ProblemStatus.Error,
              statusReason: reason,
            });
          } finally {
            releaseLock();
          }
        })();
      } catch (error) {
        // The old problem directory was already deleted before this block ran.
        // Mark the problem as Error so it is not left in a stale Ready state
        // with no files on disk.
        try {
          await Problem.findByIdAndUpdate(existingProblem._id, {
            status: ProblemStatus.Error,
            statusReason: `Update failed after deleting old problem files: ${error instanceof Error ? error.message : String(error)}`,
          });
        } catch (dbErr) {
          console.error('Failed to mark problem as Error after update failure:', dbErr);
        }
        releaseLock();
        throw error;
      }

      response.status(201).send("Problem updated successfully");
    } catch (error) {
      console.error("Error processing metadata or updating database:", error);
      throw error; // Re-throw to be caught by the outer catch block for cleanup
    }
  } catch (error) {
    // Cleanup uploaded and extracted files on error
    // Prevent directory traversal by ensuring paths are within the 'problems' directory
    const problemsBaseDir = path.resolve("problems");
    const absNewProblemDir = path.resolve(newProblemDir);
    const absTargetPath = path.resolve(targetPath);
    if (
      absNewProblemDir.startsWith(problemsBaseDir + path.sep) &&
      absTargetPath.startsWith(problemsBaseDir + path.sep)
    ) {
      spawnSync("rm", ["-rf", newProblemDir]);
      spawnSync("rm", ["-f", targetPath]);
    }
    response
      .status(400)
      .send(
        `Error updating problem: ${error instanceof Error ? error.message : "An unknown error occurred"}`,
      );
  }
};

/**
 * Generates a single test case for a problem using `tps gen` in an isolated sandbox
 * and returns a `.tar.gz` archive containing the input and output files.
 *
 * @route `GET /api/problems/:serialNumber/testcases/:testcaseName`
 * @authentication Required.
 * - **Released** problems: open to all users.
 * - **Unreleased** problems: open to JudgeAdmins and TAs.
 *
 * @param request - Express request with `serialNumber` and `testcaseName` route parameters.
 * @param response - Express response streaming the archive download.
 *
 * @returns
 * - `200 OK` with `application/gzip` archive containing `{name}.in` and `{name}.out`.
 * - `400 Bad Request` if the serial number is invalid.
 * - `404 Not Found` if the problem does not exist or is unreleased for non-admins.
 */
const generateTestcase = async (request: IRequest, response: Response) => {
  const user = request.user as IUser;
  const { testcaseName } = request.params;
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send("Invalid problem ID");
    return;
  }

  try {
    const problem = await Problem.findOne({ serialNumber });
    if (
      !problem ||
      (!problem.released &&
        user.role !== UserRole.JudgeAdmin &&
        user.role !== UserRole.TA)
    ) {
      response.sendStatus(404);
      return;
    }
  } catch (error) {
    console.error(`[generate-testcase] ${error}`);
    response.sendStatus(500);
    return;
  }

  try {
    // Generate a new testcase for the user
    const result = await generateSingleTestcase(
      serialNumber.toString(),
      testcaseName,
    );

    const requestId = `${serialNumber}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const tempDir = path.join(generatedTestcasesPath, requestId);
    fs.mkdirSync(tempDir, { recursive: true });

    const inputFilename = `${result.actualTestName}.in`;
    const outputFilename = `${result.actualTestName}.out`;
    const inputPath = path.join(tempDir, inputFilename);
    const outputPath = path.join(tempDir, outputFilename);

    fs.writeFileSync(inputPath, result.input);
    fs.writeFileSync(outputPath, result.output);

    const archiveName = `${result.actualTestName}.tar.gz`;
    const archivePath = path.join(tempDir, archiveName);

    await tar.c(
      {
        gzip: true,
        cwd: tempDir,
        file: archivePath,
      },
      [inputFilename, outputFilename],
    );

    response.download(archivePath, archiveName, (err) => {
      if (err) {
        console.error(`Failed to send generated testcase archive:`, err);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  } catch (error) {
    console.error(
      `Error generating testcase for ${serialNumber} - ${testcaseName}:`,
      error,
    );
    response
      .status(500)
      .send(
        `Failed to generate testcase: ${error instanceof Error ? error.message : "An unknown error occurred"}`,
      );
  }
};

/**
 * Retrieves the list of programming languages allowed for submissions to a specific problem.
 * Reads from `judgemeta.json` first, falling back to `problem.json`.
 *
 * @route `GET /api/problems/:serialNumber/allowed-languages`
 * 
 * @internal
 * 
 * @authentication Required.
 * - **Released** problems: open to all users.
 * - **Unreleased** problems: open to JudgeAdmins and TAs.
 *
 * @param request - Express request with `serialNumber` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with an array of allowed language identifier strings
 *   (e.g. `["gcc c17", "g++ c++17", "python3"]`). Returns `[]` if none configured.
 * - `400 Bad Request` if the serial number is invalid.
 * - `404 Not Found` if the problem does not exist or is unreleased for non-admins.
 * - `500 Internal Server Error` on file read errors.
 */
const getAllowedLanguages = async (request: IRequest, response: Response) => {
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send("Invalid problem ID");
    return;
  }

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const user = request.user as IUser | undefined;
    if (
      !problem.released &&
      (!user ||
        (user.role !== UserRole.JudgeAdmin && user.role !== UserRole.TA))
    ) {
      response.sendStatus(404);
      return;
    }

    const problemDir = "problems/" + serialNumber;
    const metadataPath = `${problemDir}/problem.json`;
    const judgeMetaPath = `${problemDir}/judgemeta.json`;

    try {
      let allowedLanguages: string[] = [];

      try {
        if (fs.existsSync(judgeMetaPath)) {
          const judgeMetaContent = readFileSync(judgeMetaPath, "utf8");
          const judgeMeta = JSON.parse(judgeMetaContent);
          allowedLanguages = judgeMeta.allowed_languages || [];
        }
      } catch (judgeMetaErr) {
        console.warn("Error reading judgemeta.json:", judgeMetaErr);
      }

      if (allowedLanguages.length === 0) {
        const metadataContent = readFileSync(metadataPath, "utf8");
        const metadata = JSON.parse(metadataContent);
        allowedLanguages = metadata.allowed_languages || [];
      }

      response.status(200).send(allowedLanguages);
    } catch (metadataErr) {
      console.error("Error reading metadata:", metadataErr);
      response.status(200).send([]);
    }
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
};

problemsRouter.get("/api/problems", getProblems);
problemsRouter.get(
  "/api/problems/:serialNumber",
  isAuthenticated,
  getProblemByID,
);
problemsRouter.get(
  "/api/problems/:serialNumber/testcases/:testcaseName",
  isAuthenticated,
  generateTestcase,
);
problemsRouter.get(
  "/api/problems/:serialNumber/allowed-languages",
  isAuthenticated,
  getAllowedLanguages,
);

problemsRouter.post(
  "/api/problems",
  isTA,
  (request: IRequest, response: Response, next) => {
    upload(request, response, (err) => {
      if (err instanceof multer.MulterError) {
        response.status(400).send(`Multer error: ${err.message}`);
        return;
      } else if (err) {
        response.status(400).send(`Error: ${err.message}`);
        return;
      }
      next();
    });
  },
  createProblem,
);

problemsRouter.delete(
  "/api/problems/:serialNumber",
  isJudgeAdmin,
  deleteProblem,
);
problemsRouter.patch(
  "/api/problems/:serialNumber",
  isTA,
  checkSchema(updateProblemValidation),
  updateProblem,
);

problemsRouter.put(
  "/api/problems/:serialNumber",
  isTA,
  (request: IRequest, response: Response, next) => {
    upload(request, response, (err) => {
      if (err instanceof multer.MulterError) {
        response.status(400).send(`Multer error: ${err.message}`);
        return;
      } else if (err) {
        response.status(400).send(`Error: ${err.message}`);
        return;
      }
      next();
    });
  },
  updateProblemWithFile,
);

export default problemsRouter;
export {
  getProblems,
  getProblemByID,
  createProblem,
  deleteProblem,
  updateProblem,
  updateProblemWithFile,
  getAllowedLanguages,
  generateTestcase,
};
