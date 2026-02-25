#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const {
  getApiUrl,
  loginAdminWithFallback,
  createUserViaApi
} = require('./account-api-utils');

const VALID_ROLES = new Set(['student', 'ta', 'judgeAdmin']);

function printHelp() {
  console.log('Create user accounts (student/ta/judgeAdmin) from CSV and send a password email to each user.');
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
  console.log('  --signature <text>    Sign-off name shown at end of mail (default: OwoJudge Team)');
  console.log('  --default-role <role> Default role when CSV role is missing (student|ta|judgeAdmin)');
  console.log('  --failed-email-report <path>  Write JSON report for accounts created but email sending failed');
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
    signature: 'OwoJudge Team',
    defaultRole: 'student',
    failedEmailReportPath: '',
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
    } else if (arg === '--signature' && args[i + 1]) {
      options.signature = args[i + 1];
      i += 1;
    } else if (arg === '--default-role' && args[i + 1]) {
      options.defaultRole = args[i + 1];
      i += 1;
    } else if (arg === '--failed-email-report' && args[i + 1]) {
      options.failedEmailReportPath = path.resolve(args[i + 1]);
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

  options.defaultRole = normalizeRole(options.defaultRole);
  if (!VALID_ROLES.has(options.defaultRole)) {
    throw new Error(`Invalid --default-role: ${options.defaultRole}`);
  }

  return options;
}

function writeFailedEmailReport(entries, customPath = '') {
  if (!entries || entries.length === 0) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = customPath || path.join(process.cwd(), `failed-email-attempts-${timestamp}.json`);

  const payload = {
    generatedAt: new Date().toISOString(),
    note: 'Contains temporary passwords. Keep this file secure and delete it after handling resends.',
    entries
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return outputPath;
}

function normalizeRole(rawRole) {
  if (!rawRole) return 'student';
  const value = String(rawRole).trim().toLowerCase();

  if (value === 'admin' || value === 'judgeadmin' || value === 'judge_admin') {
    return 'judgeAdmin';
  }
  if (value === 'ta') {
    return 'ta';
  }
  if (value === 'student') {
    return 'student';
  }

  return String(rawRole).trim();
}

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;

  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      i += 1;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
      i += 1;
      continue;
    }

    cur += ch;
    i += 1;
  }

  fields.push(cur);
  return fields.map((f) => f.trim());
}

function isValidEmail(email) {
  // Practical validation: local@domain.tld without spaces
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCsvFile(filePath, defaultRole) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const emailIdx = header.findIndex((h) => ['email', 'mail', 'username'].includes(h));
  const nameIdx = header.findIndex((h) => ['name', 'displayname', 'display_name', 'student_name'].includes(h));
  const roleIdx = header.findIndex((h) => ['role', 'accounttype', 'account_type'].includes(h));

  if (emailIdx < 0 || nameIdx < 0) {
    throw new Error('CSV header must contain email and name columns');
  }

  const rows = [];
  const invalidEmails = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const email = (cols[emailIdx] || '').trim();
    const name = (cols[nameIdx] || '').trim();
    const roleRaw = roleIdx >= 0 ? (cols[roleIdx] || '').trim() : '';
    const role = normalizeRole(roleRaw || defaultRole);

    if (!email || !name) {
      continue;
    }

    if (!isValidEmail(email)) {
      invalidEmails.push({ line: i + 1, email });
      continue;
    }

    rows.push({ email, name, role, line: i + 1 });
  }

  if (invalidEmails.length > 0) {
    const details = invalidEmails
      .slice(0, 10)
      .map((item) => `line ${item.line}: ${item.email}`)
      .join('; ');
    const more = invalidEmails.length > 10
      ? `; ...and ${invalidEmails.length - 10} more`
      : '';
    throw new Error(`Invalid email format in CSV (${invalidEmails.length} row(s)): ${details}${more}`);
  }

  return rows;
}

function randomPassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const max = 256 - (256 % chars.length);
  let out = '';

  while (out.length < length) {
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < bytes.length && out.length < length; i += 1) {
      const byte = bytes[i];
      if (byte < max) {
        out += chars[byte % chars.length];
      }
    }
  }
  return out;
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
  if (!Number.isFinite(port) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port number (1-65535)');
  }
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  const auth = process.env.SMTP_USER
    ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || ''
    }
    : undefined;

  return nodemailer.createTransport({ host, port, secure, auth });
}

async function sendWelcomeMail({ transporter, fromEmail, toEmail, name, password, subject, signature }) {
  const text = [
    `Hello ${name},`,
    '',
    'Your OwoJudge account has been created.',
    `Username: ${toEmail}`,
    `Temporary password: ${password}`,
    '',
    'Please sign in and change your password immediately.',
    '',
    'Best regards,',
    signature
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
  const accounts = parseCsvFile(options.csvPath, options.defaultRole);

  if (accounts.length === 0) {
    throw new Error('No valid account rows found in CSV');
  }

  console.log(`CSV loaded: ${accounts.length} accounts`);

  const invalidRows = accounts.filter((item) => !VALID_ROLES.has(item.role));
  if (invalidRows.length > 0) {
    throw new Error(`Invalid role(s) in CSV at line(s): ${invalidRows.map((r) => r.line).join(', ')}`);
  }

  if (options.dryRun) {
    console.log('Dry run mode: no users will be created and no emails will be sent.');
    console.log('');
    console.log('==========================================');
    console.log('Dry Run Preview: Accounts that would be created');
    console.log('==========================================');
    accounts.forEach((account) => {
      console.log(
        `- line ${account.line}: email="${account.email}", name="${account.name}", role="${account.role}"`
      );
    });
    console.log('==========================================');
    console.log(`Total accounts: ${accounts.length}`);
    console.log(
      `Roles: student=${accounts.filter((a) => a.role === 'student').length}, ` +
      `ta=${accounts.filter((a) => a.role === 'ta').length}, ` +
      `judgeAdmin=${accounts.filter((a) => a.role === 'judgeAdmin').length}`
    );
    return;
  }

  const transporter = buildMailer(false);
  await transporter.verify();
  console.log('SMTP connection verified.');

  const apiUrl = getApiUrl();
  const { adminUsername, cookie } = await loginAdminWithFallback(apiUrl);
  console.log(`Logged in as ${adminUsername}.`);

  const created = [];
  const failed = [];
  const emailFailedAfterCreate = [];
  const createdByRole = { student: 0, ta: 0, judgeAdmin: 0 };

  for (const account of accounts) {
    const password = randomPassword(16);
    const userData = {
      username: account.email,
      displayName: account.name,
      password,
      role: account.role
    };

    try {
      await createUserViaApi(userData, cookie, apiUrl);

      try {
        await sendWelcomeMail({
          transporter,
          fromEmail: options.fromEmail,
          toEmail: account.email,
          name: account.name,
          password,
          subject: options.subject,
          signature: options.signature
        });

        created.push(account.email);
        createdByRole[account.role] += 1;
        console.log(`INFO: Created (${account.role}) and mailed ${account.email}`);
      } catch (mailError) {
        const mailReason = mailError && mailError.message ? mailError.message : String(mailError);
        emailFailedAfterCreate.push({
          email: account.email,
          name: account.name,
          role: account.role,
          studentId: account.studentId || '',
          temporaryPassword: password,
          reason: mailReason
        });

        failed.push({
          email: account.email,
          reason: `Email failed after account creation: ${mailReason}`
        });

        console.log(`✗ Created account but failed to send email for ${account.email}: ${mailReason}`);
      }
    } catch (error) {
      const reason = error && error.message ? error.message : String(error);
      failed.push({ email: account.email, reason });
      console.log(`✗ Failed for ${account.email}: ${reason}`);
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('Account Creation Summary');
  console.log('==========================================');
  console.log(`Total CSV Rows: ${accounts.length}`);
  console.log(`Created + Emailed: ${created.length}`);
  console.log(`  - student: ${createdByRole.student}`);
  console.log(`  - ta: ${createdByRole.ta}`);
  console.log(`  - judgeAdmin: ${createdByRole.judgeAdmin}`);
  console.log(`Email Failed After Create: ${emailFailedAfterCreate.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('==========================================');

  if (emailFailedAfterCreate.length > 0) {
    const reportPath = writeFailedEmailReport(emailFailedAfterCreate, options.failedEmailReportPath);
    if (reportPath) {
      console.log('');
      console.log(`Email failure report written to: ${reportPath}`);
      console.log('IMPORTANT: Report contains temporary passwords. Handle securely and delete after resend.');
    }
  }

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
