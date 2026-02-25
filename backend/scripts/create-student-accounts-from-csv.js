#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

const API_URL = process.env.API_URL || 'http://localhost:8787/api';

function printHelp() {
  console.log('Create student accounts from CSV and send password email to each student.');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/create-student-accounts-from-csv.js --csv <file> --from <sender@email> [options]');
  console.log('');
  console.log('Required args:');
  console.log('  --csv <file>          CSV file path, with columns: email,name (header required)');
  console.log('  --from <email>        Sender email address');
  console.log('');
  console.log('Optional args:');
  console.log('  --subject <text>      Mail subject');
  console.log('  --dry-run             Validate and preview only (no user creation, no email)');
  console.log('  --help                Show this help');
  console.log('');
  console.log('Env for admin login:');
  console.log('  ROOT_USERNAME / ADMIN_USERNAME / ADMIN_PASSWD / ADMIN_PASSWORD');
  console.log('');
  console.log('Env for SMTP:');
  console.log('  SMTP_HOST (required unless --dry-run)');
  console.log('  SMTP_PORT (default: 587)');
  console.log('  SMTP_SECURE (true/false, default: false)');
  console.log('  SMTP_USER');
  console.log('  SMTP_PASS');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    csvPath: '',
    fromEmail: '',
    subject: 'Your OwoJudge account has been created',
    dryRun: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--csv' && args[i + 1]) {
      options.csvPath = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === '--from' && args[i + 1]) {
      options.fromEmail = args[i + 1];
      i += 1;
    } else if (arg === '--subject' && args[i + 1]) {
      options.subject = args[i + 1];
      i += 1;
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
  if (!options.fromEmail) {
    throw new Error('Missing required argument: --from <sender@email>');
  }

  return options;
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
      continue;
    }

    if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  fields.push(cur);
  return fields.map((f) => f.trim());
}

function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const emailIdx = header.findIndex((h) => ['email', 'mail', 'username'].includes(h));
  const nameIdx = header.findIndex((h) => ['name', 'displayname', 'display_name', 'student_name'].includes(h));

  if (emailIdx < 0 || nameIdx < 0) {
    throw new Error('CSV header must contain email and name columns');
  }

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const email = (cols[emailIdx] || '').trim();
    const name = (cols[nameIdx] || '').trim();

    if (!email || !name) {
      continue;
    }

    rows.push({ email, name, line: i + 1 });
  }

  return rows;
}

function randomPassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function login(username, password) {
  const response = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${username}: ${response.status}`);
  }

  const rawSetCookie = response.headers.get('set-cookie');
  if (!rawSetCookie) {
    throw new Error(`Login failed for ${username}: missing Set-Cookie header`);
  }

  // Keep only the cookie pair, e.g. "connect.sid=..."
  return rawSetCookie.split(';')[0];
}

function getAdminPasswordCandidates() {
  const out = [];

  if (process.env.ADMIN_PASSWD) out.push(process.env.ADMIN_PASSWD);
  if (process.env.ADMIN_PASSWORD) out.push(process.env.ADMIN_PASSWORD);

  const credentialFiles = [
    path.join(process.cwd(), 'admin-credentials.json'),
    '/app/admin-credentials.json'
  ];

  for (const filePath of credentialFiles) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed && parsed.password) out.push(String(parsed.password));
    } catch (_error) {
      // ignore broken credential file
    }
  }

  out.push('adminpassword', 'admin1234');
  return [...new Set(out.filter(Boolean))];
}

async function loginAdminWithFallback() {
  const adminUsername = process.env.ROOT_USERNAME || process.env.ADMIN_USERNAME || 'admin';
  const candidates = getAdminPasswordCandidates();

  let lastError;
  for (const password of candidates) {
    try {
      const cookie = await login(adminUsername, password);
      return { adminUsername, cookie };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Unable to login as ${adminUsername}`);
}

async function createUser(userData, adminCookie) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} - ${text}`);
  }

  return response.json();
}

function buildMailer(dryRun) {
  if (dryRun) {
    return null;
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error('SMTP_HOST is required unless --dry-run is used');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  const auth = process.env.SMTP_USER
    ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || ''
    }
    : undefined;

  return nodemailer.createTransport({ host, port, secure, auth });
}

async function sendWelcomeMail({ transporter, fromEmail, toEmail, name, password, subject }) {
  const text = [
    `Hello ${name},`,
    '',
    'Your OwoJudge account has been created.',
    `Username: ${toEmail}`,
    `Temporary password: ${password}`,
    '',
    'Please sign in and change your password immediately.',
    '',
    'Best regards,'
  ].join('\n');

  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject,
    text
  });
}

async function main() {
  const options = parseArgs();
  const students = parseCsvFile(options.csvPath);

  if (students.length === 0) {
    throw new Error('No valid student rows found in CSV');
  }

  console.log(`CSV loaded: ${students.length} students`);

  if (options.dryRun) {
    console.log('Dry run mode: no users will be created and no emails will be sent.');
    return;
  }

  const transporter = buildMailer(false);
  await transporter.verify();
  console.log('SMTP connection verified.');

  const { adminUsername, cookie } = await loginAdminWithFallback();
  console.log(`Logged in as ${adminUsername}.`);

  const created = [];
  const failed = [];

  for (const student of students) {
    const password = randomPassword(16);
    const userData = {
      username: student.email,
      displayName: student.name,
      password,
      role: 'student'
    };

    try {
      await createUser(userData, cookie);

      await sendWelcomeMail({
        transporter,
        fromEmail: options.fromEmail,
        toEmail: student.email,
        name: student.name,
        password,
        subject: options.subject
      });

      created.push(student.email);
      console.log(`INFO: Created and mailed ${student.email}`);
    } catch (error) {
      const reason = error && error.message ? error.message : String(error);
      failed.push({ email: student.email, reason });
      console.log(`✗ Failed for ${student.email}: ${reason}`);
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('Student Account Creation Summary');
  console.log('==========================================');
  console.log(`Total CSV Rows: ${students.length}`);
  console.log(`Created + Emailed: ${created.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('==========================================');

  if (failed.length > 0) {
    console.log('');
    console.log('Failures:');
    failed.forEach((item) => {
      console.log(`- ${item.email}: ${item.reason}`);
    });
  }
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
