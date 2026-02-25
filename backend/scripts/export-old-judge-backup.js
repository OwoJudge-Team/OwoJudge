const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';
const DEFAULT_OUTPUT_DIR = process.env.EXPORT_DIR || path.join(__dirname, '../exports');

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    mongoUri: DEFAULT_MONGO_URI,
    outputDir: DEFAULT_OUTPUT_DIR,
    includeRawDump: true
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--mongo-uri' && args[i + 1]) {
      options.mongoUri = args[i + 1];
      i += 1;
    } else if (arg === '--output-dir' && args[i + 1]) {
      options.outputDir = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === '--no-raw') {
      options.includeRawDump = false;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log('Export current judge data and convert it to old judge format.');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/export-old-judge-backup.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --mongo-uri <uri>     MongoDB URI (default: env MONGODB_URI or mongodb://localhost:27017/judge)');
  console.log('  --output-dir <path>   Output directory (default: backend/exports)');
  console.log('  --no-raw              Skip writing raw OwoJudge dump');
  console.log('  --help                Show this help');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function mapRoleToLegacyRoles(role) {
  switch (role) {
    case 'judgeAdmin':
      return ['admin'];
    case 'ta':
      return ['admin'];
    case 'student':
    default:
      return ['student'];
  }
}

function mapSubmissionStatus(status) {
  const mapping = {
    pending: { legacyStatus: 'pending', result: 'PD' },
    'in queue': { legacyStatus: 'pending', result: 'PD' },
    Accepted: { legacyStatus: 'finished', result: 'AC' },
    'Wrong Answer': { legacyStatus: 'finished', result: 'WA' },
    'Presentation Error': { legacyStatus: 'finished', result: 'PE' },
    'Partially Scored': { legacyStatus: 'finished', result: 'PS' },
    'Compilation Error': { legacyStatus: 'finished', result: 'CE' },
    'Runtime Error': { legacyStatus: 'finished', result: 'RE' },
    'Memory Limit Exceeded': { legacyStatus: 'finished', result: 'MLE' },
    'Time Limit Exceeded': { legacyStatus: 'finished', result: 'TLE' },
    'Process Limit Exceeded': { legacyStatus: 'finished', result: 'PLE' },
    'System Error': { legacyStatus: 'finished', result: 'SE' }
  };

  return mapping[status] || { legacyStatus: 'pending', result: 'PD' };
}

function convertQuotaUsageToSubmissionLimit(quotaUsage) {
  if (!quotaUsage || typeof quotaUsage !== 'object') {
    return [];
  }

  const entries = quotaUsage instanceof Map ? Array.from(quotaUsage.entries()) : Object.entries(quotaUsage);

  return entries
    .map(([problemId, usage]) => ({
      problem_id: Number(problemId),
      last_submission: usage?.date ? new Date(usage.date) : null,
      quota: Number(usage?.count || 0)
    }))
    .filter((item) => Number.isFinite(item.problem_id))
    .sort((a, b) => a.problem_id - b.problem_id);
}

function toLegacyProblem(problem) {
  const subtaskMap = new Map();

  for (const testcase of problem.testcase || []) {
    const subtaskName = testcase.subtask || 'default';
    if (!subtaskMap.has(subtaskName)) {
      subtaskMap.set(subtaskName, {
        count: 0,
        points: 0,
        tests: []
      });
    }

    const group = subtaskMap.get(subtaskName);
    group.count += 1;
    group.points += Number(testcase.point || 0);
    if (testcase.filename) {
      group.tests.push(String(testcase.filename));
    }
  }

  return {
    _id: Number(problem.serialNumber),
    name: problem.title || `Problem ${problem.serialNumber}`,
    problemType: 'User',
    visible: Boolean(problem.released),
    timeLimit: Number(problem.timeLimit || 1),
    memLimit: Number(problem.memoryLimit || (1 << 20)),
    quota: Number(problem.dailyQuota || 5),
    hasSpecialJudge: Boolean(problem.hasGrader),
    notGitOnly: false,
    hasPartialScorePerTestdata: (problem.scorePolicy || 'sum') !== 'sum',
    showStatistic: true,
    uploadOutput: false,
    showScoreboard: true,
    showDetailSubtask: true,
    testdata: {
      count: (problem.testcase || []).length,
      points: Number(problem.fullScore || 100),
      groups: Array.from(subtaskMap.values())
    },
    testFiles: [],
    resource: [],
    compileEXArg: [],
    compileEXHeader: [],
    compileEXFile: [],
    compileEXLink: [],
    compileEXArgForChecker: [],
    compileEXHeaderForChecker: [],
    compileEXFileForChecker: [],
    compileEXLinkForChecker: [],
    runtimeEXFile: []
  };
}

function getSubmissionRuntime(submission) {
  if (typeof submission.time === 'number' && Number.isFinite(submission.time)) {
    return submission.time;
  }

  let maxRuntime = 0;
  const results = submission.results;

  if (results && typeof results === 'object') {
    for (const groupName of Object.keys(results)) {
      const group = results[groupName];
      const testcases = group?.testcases || [];
      for (const testcase of testcases) {
        const testcaseTime = Number(testcase?.time || 0);
        if (testcaseTime > maxRuntime) {
          maxRuntime = testcaseTime;
        }
      }
    }
  }

  return maxRuntime;
}

function toLegacyHomework(contest, fallbackId) {
  const problemList = (contest.problems || [])
    .filter((item) => Number.isFinite(Number(item?.serialNumber)))
    .map((item) => ({
      problem: Number(item.serialNumber),
      weight: Number.isFinite(Number(item.score)) ? Number(item.score) : 1
    }));

  const totalPoints = problemList.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  return {
    _id: Number(fallbackId),
    name: contest.title || `Homework ${fallbackId}`,
    due: contest.submissionEndTime || contest.endTime || null,
    visible: Boolean(contest.released),
    problems: problemList,
    problemNum: problemList.length,
    totalPoints,
    desc: contest.description || '',
    meta: {
      pdfLink: ''
    },
    showStatistic: true,
    showScoreboard: Array.isArray(contest.standings) && contest.standings.length > 0
  };
}

function convertData({ users, problems, submissions, contests }) {
  const usersById = new Map(users.map((u) => [String(u._id), u]));

  const legacyUsers = users.map((user) => ({
    _id: user._id,
    email: user.username,
    password: user.password,
    ssh_key: user.gitPublicKey || '',
    git_upload_key: '',
    accountType: 'User',
    meta: {
      name: user.displayName || user.username,
      id: user.studentId || ''
    },
    submission_limit: convertQuotaUsageToSubmissionLimit(user.quotaUsage),
    roles: mapRoleToLegacyRoles(user.role),
    homeworks: [],
    groups: []
  }));

  const legacyProblems = problems
    .filter((problem) => Number.isFinite(Number(problem.serialNumber)))
    .map((problem) => toLegacyProblem(problem));

  const legacyResultCollection = [];

  const legacySubmissions = submissions
    .filter((submission) => Number.isFinite(Number(submission.serialNumber)))
    .map((submission) => {
      const mapped = mapSubmissionStatus(submission.status);
      const resultId = new mongoose.Types.ObjectId();
      const runtime = getSubmissionRuntime(submission);
      const points = Number(submission.score || 0);

      const userDoc = usersById.get(String(submission.userID));
      const submittedBy = submission.userID || userDoc?._id;

      legacyResultCollection.push({
        _id: resultId,
        submissionId: Number(submission.serialNumber),
        problem: Number(submission.problemSerialNumber),
        username: submission.username,
        status: mapped.result,
        points,
        runtime,
        memory: Number(submission.memory || 0),
        language: submission.language || '',
        userSolution: submission.userSolution || [],
        detail: submission.results || {}
      });

      return {
        _id: Number(submission.serialNumber),
        problem: Number(submission.problemSerialNumber),
        submittedBy,
        ts: submission.createdAt || new Date(),
        judgeTs: submission.updatedAt || submission.createdAt || new Date(),
        status: mapped.legacyStatus,
        result: mapped.result,
        points,
        runtime,
        gitCommitHash: submission.gitCommitHash || '',
        _result: resultId
      };
    });

  const legacyHomeworks = (contests || []).map((contest, index) => toLegacyHomework(contest, index + 1));

  return {
    users: legacyUsers,
    problems: legacyProblems,
    homeworks: legacyHomeworks,
    submissions: legacySubmissions,
    results: legacyResultCollection
  };
}

async function main() {
  const options = parseCliArgs();
  ensureDir(options.outputDir);

  console.log(`Connecting to MongoDB: ${options.mongoUri}`);
  await mongoose.connect(options.mongoUri);

  try {
    const db = mongoose.connection.db;

    const [users, problems, submissions, contests] = await Promise.all([
      db.collection('users').find({}).toArray(),
      db.collection('problems').find({}).toArray(),
      db.collection('submissions').find({}).toArray(),
      db.collection('contests').find({}).toArray()
    ]);

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-');

    if (options.includeRawDump) {
      const rawPath = path.join(options.outputDir, `owojudge-raw-${stamp}.json`);
      fs.writeFileSync(
        rawPath,
        JSON.stringify({
          generatedAt: now.toISOString(),
          source: 'OwoJudge',
          users,
          problems,
          submissions,
          contests
        }, null, 2)
      );
      console.log(`Raw dump written to ${rawPath}`);
    }

    const converted = convertData({ users, problems, submissions, contests });
    const convertedPath = path.join(options.outputDir, `old-judge-converted-${stamp}.json`);

    fs.writeFileSync(
      convertedPath,
      JSON.stringify({
        generatedAt: now.toISOString(),
        source: 'OwoJudge',
        target: 'old-judge',
        notes: {
          usernameMappedToEmail: true,
          submissionResultDetailIncluded: true
        },
        ...converted
      }, null, 2)
    );

    console.log('----------------------------------------');
    console.log(`Users exported: ${converted.users.length}`);
    console.log(`Problems exported: ${converted.problems.length}`);
    console.log(`Homeworks exported: ${converted.homeworks.length}`);
    console.log(`Submissions exported: ${converted.submissions.length}`);
    console.log(`Submission details exported: ${converted.results.length}`);
    console.log(`Converted file written to ${convertedPath}`);
    console.log('Done.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
