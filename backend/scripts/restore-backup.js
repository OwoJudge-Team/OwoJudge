const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

function printHelp() {
  console.log('Replace current OwoJudge database with a backup file.');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/restore-backup.js --file <backup.json> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --file <path>         Backup JSON file path (required)');
  console.log(`  --mongo-uri <uri>     MongoDB URI (default: ${DEFAULT_MONGO_URI})`);
  console.log('  --yes                 Skip confirmation prompt');
  console.log('  --dry-run             Validate backup and show summary only (no DB write)');
  console.log('  --help                Show this help');
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    mongoUri: DEFAULT_MONGO_URI,
    filePath: '',
    skipConfirm: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--file' && args[i + 1]) {
      options.filePath = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === '--mongo-uri' && args[i + 1]) {
      options.mongoUri = args[i + 1];
      i += 1;
    } else if (arg === '--yes') {
      options.skipConfirm = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.filePath) {
    throw new Error('Missing required argument: --file <backup.json>');
  }

  return options;
}

function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => resolve((data || '').trim()));
  });
}

function toDateOrNow(value, fallbackNow = new Date()) {
  if (!value) {
    return fallbackNow;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallbackNow : parsed;
}

const DEFAULT_HOMEWORK_DURATION_DAYS = Number.isFinite(Number(process.env.HOMEWORK_DURATION_DAYS))
  ? Number(process.env.HOMEWORK_DURATION_DAYS)
  : 7;

const DEFAULT_HOMEWORK_DURATION_MS = DEFAULT_HOMEWORK_DURATION_DAYS * 24 * 60 * 60 * 1000;

function convertHomeworksToContests(homeworks, generatedAt) {
  const referenceNow = toDateOrNow(generatedAt, new Date());

  return homeworks.map((homework) => {
    const end = toDateOrNow(homework.due, referenceNow);
    const start = new Date(end.getTime() - DEFAULT_HOMEWORK_DURATION_MS);

    return {
      title: homework.name || 'Recovered Homework',
      description: homework.desc || '',
      startTime: start,
      submissionEndTime: end,
      submissionEndTime: end,
      released: Boolean(homework.visible),
      problems: (homework.problems || [])
        .filter((item) => Number.isFinite(Number(item?.problem)))
        .map((item) => ({
          serialNumber: Number(item.problem),
          score: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1
        })),
      standings: []
    };
  });
}

function normalizeBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup file does not contain a valid JSON object');
  }

  const users = Array.isArray(payload.users) ? payload.users : [];
  const problems = Array.isArray(payload.problems) ? payload.problems : [];
  const submissions = Array.isArray(payload.submissions) ? payload.submissions : [];

  let contests = [];
  if (Array.isArray(payload.contests)) {
    contests = payload.contests;
  } else if (Array.isArray(payload.homeworks)) {
    contests = convertHomeworksToContests(payload.homeworks, payload.generatedAt);
  }

  return { users, problems, submissions, contests };
}

function getInsertedCountFromBulkError(error) {
  if (typeof error?.result?.nInserted === 'number') {
    return error.result.nInserted;
  }
  if (typeof error?.insertedCount === 'number') {
    return error.insertedCount;
  }
  if (Array.isArray(error?.insertedDocs)) {
    return error.insertedDocs.length;
  }
  return 0;
}

function getWriteErrors(error) {
  if (Array.isArray(error?.writeErrors)) {
    return error.writeErrors;
  }
  if (Array.isArray(error?.result?.result?.writeErrors)) {
    return error.result.result.writeErrors;
  }
  return [];
}

async function insertManyWithReport(collection, docs, label) {
  if (!docs || docs.length === 0) {
    return {
      label,
      attempted: 0,
      inserted: 0,
      failed: 0,
      partialFailure: false
    };
  }

  try {
    const result = await collection.insertMany(docs, { ordered: false });
    const inserted = Object.keys(result.insertedIds || {}).length;

    return {
      label,
      attempted: docs.length,
      inserted,
      failed: docs.length - inserted,
      partialFailure: false
    };
  } catch (error) {
    const writeErrors = getWriteErrors(error);
    const isBulkWrite = writeErrors.length > 0 || error?.name === 'MongoBulkWriteError' || error?.name === 'BulkWriteError';

    if (!isBulkWrite) {
      throw error;
    }

    const inserted = getInsertedCountFromBulkError(error);
    const failed = Math.max(0, docs.length - inserted);

    console.warn(`[Restore] Partial insert for ${label}: inserted=${inserted}, failed=${failed}, attempted=${docs.length}`);
    writeErrors.slice(0, 5).forEach((we, idx) => {
      console.warn(`[Restore] ${label} writeError[${idx}] code=${we?.code} message=${we?.errmsg || we?.message || 'Unknown error'}`);
    });
    if (writeErrors.length > 5) {
      console.warn(`[Restore] ${label} additional writeErrors omitted: ${writeErrors.length - 5}`);
    }

    return {
      label,
      attempted: docs.length,
      inserted,
      failed,
      partialFailure: true
    };
  }
}

async function restoreCollections(db, backup) {
  const usersCollection = db.collection('users');
  const problemsCollection = db.collection('problems');
  const submissionsCollection = db.collection('submissions');
  const contestsCollection = db.collection('contests');
  const countersCollection = db.collection('counters');

  await Promise.all([
    usersCollection.deleteMany({}),
    problemsCollection.deleteMany({}),
    submissionsCollection.deleteMany({}),
    contestsCollection.deleteMany({}),
    countersCollection.deleteMany({ _id: 'problemSerialNumber' })
  ]);

  const insertReports = [];
  insertReports.push(await insertManyWithReport(usersCollection, backup.users, 'users'));
  insertReports.push(await insertManyWithReport(problemsCollection, backup.problems, 'problems'));
  insertReports.push(await insertManyWithReport(submissionsCollection, backup.submissions, 'submissions'));
  insertReports.push(await insertManyWithReport(contestsCollection, backup.contests, 'contests'));

  const maxProblemSerial = backup.problems.reduce((maxSerial, problem) => {
    const serial = Number(problem?.serialNumber);
    return Number.isFinite(serial) && serial > maxSerial ? serial : maxSerial;
  }, -1);

  if (maxProblemSerial >= 0) {
    await countersCollection.updateOne(
      { _id: 'problemSerialNumber' },
      { $set: { seq: maxProblemSerial + 1 } },
      { upsert: true }
    );
  }

  return {
    insertReports,
    hasPartialFailures: insertReports.some((r) => r.partialFailure)
  };
}

async function main() {
  const options = parseCliArgs();

  if (!fs.existsSync(options.filePath)) {
    throw new Error(`Backup file not found: ${options.filePath}`);
  }

  const rawText = fs.readFileSync(options.filePath, 'utf-8');
  const parsed = JSON.parse(rawText);
  const backup = normalizeBackupPayload(parsed);

  console.log('Backup content summary:');
  console.log(`- users: ${backup.users.length}`);
  console.log(`- problems: ${backup.problems.length}`);
  console.log(`- submissions: ${backup.submissions.length}`);
  console.log(`- contests: ${backup.contests.length}`);
  console.log('');

  if (options.dryRun) {
    console.log('Dry run mode enabled: no data will be written.');
    return;
  }

  if (!options.skipConfirm) {
    const answer = (await prompt('This will REPLACE current DB data. Continue? (yes/no): ')).toLowerCase();
    if (answer !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  console.log(`Connecting to MongoDB: ${options.mongoUri}`);
  await mongoose.connect(options.mongoUri);

  try {
    const restoreReport = await restoreCollections(mongoose.connection.db, backup);
    console.log('----------------------------------------');
    console.log('Restore completed successfully.');
    console.log(`Users restored: ${backup.users.length}`);
    console.log(`Problems restored: ${backup.problems.length}`);
    console.log(`Submissions restored: ${backup.submissions.length}`);
    console.log(`Contests restored: ${backup.contests.length}`);

    if (restoreReport.hasPartialFailures) {
      console.log('----------------------------------------');
      console.log('Restore completed with partial insert failures:');
      restoreReport.insertReports.forEach((r) => {
        console.log(`- ${r.label}: attempted=${r.attempted}, inserted=${r.inserted}, failed=${r.failed}`);
      });
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Restore failed:', error.message || error);
  process.exit(1);
});
