#!/usr/bin/env node
/**
 * Batch-update the email field for existing OwoJudge users.
 *
 * Reads a CSV file with `username` and `email` columns and writes the email
 * directly to MongoDB. Intended for machine-level admin use when usernames do
 * not follow a predictable `username@domain` pattern.
 *
 * Usage:
 *   node scripts/set-emails.js --csv <file> [options]
 *
 * CSV format (header required):
 *   username,email
 *   alice,alice@example.com
 *   bob,bob@other.org
 *
 * Options:
 *   --csv <path>        CSV file path (required)
 *   --mongo-uri <uri>   MongoDB URI (default: $MONGODB_URI or mongodb://localhost:27017/judge)
 *   --yes               Skip confirmation prompt
 *   --dry-run           Show what would be updated without writing
 *   --help              Show this help
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

function printHelp() {
  console.log('Batch-set the email field for existing OwoJudge users from a CSV file.');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/set-emails.js --csv <file> [options]');
  console.log('');
  console.log('CSV format (header required, columns: username, email):');
  console.log('  username,email');
  console.log('  alice,alice@example.com');
  console.log('');
  console.log('Options:');
  console.log('  --csv <path>        CSV file path (required)');
  console.log(`  --mongo-uri <uri>   MongoDB URI (default: ${DEFAULT_MONGO_URI})`);
  console.log('  --yes               Skip confirmation prompt');
  console.log('  --dry-run           Show what would be updated without writing');
  console.log('  --help              Show this help');
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    csvPath: '',
    mongoUri: DEFAULT_MONGO_URI,
    skipConfirm: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--csv' && args[i + 1]) {
      options.csvPath = path.resolve(args[i + 1]);
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

  if (!options.csvPath) {
    throw new Error('Missing required argument: --csv <file>');
  }

  return options;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const usernameIdx = header.indexOf('username');
  const emailIdx = header.indexOf('email');

  if (usernameIdx < 0 || emailIdx < 0) {
    throw new Error('CSV header must contain "username" and "email" columns');
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const username = (cols[usernameIdx] || '').trim();
    const email = (cols[emailIdx] || '').trim();

    if (!username || !email) {
      errors.push(`line ${i + 1}: missing username or email`);
      continue;
    }

    if (!isValidEmail(email)) {
      errors.push(`line ${i + 1}: invalid email "${email}" for username "${username}"`);
      continue;
    }

    rows.push({ username, email, line: i + 1 });
  }

  if (errors.length > 0) {
    throw new Error(`CSV validation errors:\n  ${errors.join('\n  ')}`);
  }

  return rows;
}

function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => resolve((data || '').trim()));
  });
}

async function main() {
  const options = parseCliArgs();

  if (!fs.existsSync(options.csvPath)) {
    throw new Error(`CSV file not found: ${options.csvPath}`);
  }

  const rows = parseCsv(options.csvPath);

  console.log(`CSV loaded: ${rows.length} row(s)`);
  rows.forEach((r) => console.log(`  ${r.username} → ${r.email}`));
  console.log('');

  if (options.dryRun) {
    console.log('Dry run mode: no changes will be written.');
    return;
  }

  if (!options.skipConfirm) {
    const answer = (await prompt(`Update ${rows.length} user email(s) in MongoDB? (yes/no): `)).toLowerCase();
    if (answer !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  console.log(`Connecting to MongoDB: ${options.mongoUri}`);
  await mongoose.connect(options.mongoUri);

  const usersCollection = mongoose.connection.db.collection('users');

  let updated = 0;
  let notFound = 0;

  try {
    for (const row of rows) {
      const result = await usersCollection.updateOne(
        { username: row.username },
        { $set: { email: row.email } }
      );

      if (result.matchedCount === 0) {
        console.warn(`  WARN: user "${row.username}" not found, skipped`);
        notFound += 1;
      } else {
        console.log(`  OK: ${row.username} → ${row.email}`);
        updated += 1;
      }
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log('');
  console.log(`Done. Updated: ${updated}, Not found: ${notFound}`);
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
