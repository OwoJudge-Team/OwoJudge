const fetch = require('node-fetch');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8787/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWD || 'adminpassword';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';
const ENABLE_DB_FALLBACK = process.env.ENABLE_DB_FALLBACK !== 'false';

// Student ID configuration
const STUDENT_ID_START = 902001;
const STUDENT_ID_PREFIX = 'b14';

// Get command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 150; // Default to 150 users (b14902001 to b14902150)
const password = args[1] || 'password123';

let salt;

function readSalt() {
  if (salt) {
    return salt;
  }

  const saltPath = path.join(process.cwd(), 'salt.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(saltPath, 'utf-8'));
    salt = parsed.salt;
  } catch (error) {
    salt = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(saltPath, JSON.stringify({ salt }, null, 4));
  }

  return salt;
}

function hashString(str) {
  return crypto.scryptSync(str, readSalt(), 32).toString('hex');
}

function generateStudentId(index) {
  const studentNumber = STUDENT_ID_START + index;
  return `${STUDENT_ID_PREFIX}${studentNumber}`;
}

async function login() {
  try {
    console.log(`Logging in as ${ADMIN_USERNAME}...`);
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const cookies = response.headers.get('set-cookie');
    console.log('Logged in successfully');
    return cookies;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function createUser(userData, cookie) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function createUserByMongoFallback(userData) {
  await mongoose.connect(MONGODB_URI);

  try {
    const users = mongoose.connection.db.collection('users');
    const existingUser = await users.findOne({ username: userData.username }, { projection: { _id: 1 } });
    if (existingUser) {
      return { username: userData.username, existed: true };
    }

    const doc = {
      username: userData.username,
      displayName: userData.displayName,
      password: hashString(userData.password),
      role: userData.role || 'student',
      solvedProblem: 0,
      solvedProblems: [],
      rating: 0,
      quotaUsage: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await users.insertOne(doc);
    return { username: userData.username, existed: false };
  } finally {
    await mongoose.disconnect();
  }
}

async function createMockUsers() {
  try {
    console.log(`Creating ${count} mock users via API...`);
    console.log(`Student IDs: ${generateStudentId(0)} to ${generateStudentId(count - 1)}`);

    const cookie = await login();

    const createdUsers = [];
    const failedUsers = [];

    for (let i = 0; i < count; i++) {
      try {
        const studentId = generateStudentId(i);

        const userData = {
          username: studentId,
          displayName: studentId,
          password,
          role: 'student'
        };

        const result = await createUser(userData, cookie);

        createdUsers.push({
          username: studentId,
          displayName: studentId
        });

        console.log(`INFO: Created user ${i + 1}/${count}: ${studentId}`);
      } catch (error) {
        const studentId = generateStudentId(i);

        const shouldFallback = ENABLE_DB_FALLBACK
          && typeof error.message === 'string'
          && error.message.includes('Failed to create Gitea user');

        if (shouldFallback) {
          try {
            const fallbackResult = await createUserByMongoFallback({
              username: studentId,
              displayName: studentId,
              password,
              role: 'student'
            });

            createdUsers.push({
              username: studentId,
              displayName: studentId
            });

            if (fallbackResult.existed) {
              console.log(`INFO: User ${studentId} already exists (fallback DB check).`);
            } else {
              console.log(`INFO: Created user ${i + 1}/${count}: ${studentId} (fallback via MongoDB, Gitea skipped)`);
            }
            continue;
          } catch (fallbackError) {
            const fallbackReason = fallbackError && fallbackError.message ? fallbackError.message : String(fallbackError);
            failedUsers.push({ username: studentId, reason: `${error.message}; fallback failed: ${fallbackReason}` });
            console.log(`✗ Failed to create user ${i + 1}/${count}: ${studentId} - ${error.message}; fallback failed: ${fallbackReason}`);
            continue;
          }
        }

        failedUsers.push({ username: studentId, reason: error.message });
        console.log(`✗ Failed to create user ${i + 1}/${count}: ${studentId} - ${error.message}`);
      }
    }

    console.log('\n==========================================');
    console.log('Mock Users Creation Summary');
    console.log('==========================================');
    console.log(`Total Requested: ${count}`);
    console.log(`Successfully Created: ${createdUsers.length}`);
    console.log(`Failed: ${failedUsers.length}`);
    console.log(`Default Password: ${password}`);
    console.log('==========================================\n');

    if (createdUsers.length > 0) {
      console.log('Created Users (showing first 10):');
      console.log('----------------------------');
      createdUsers.slice(0, 10).forEach(user => {
        console.log(`Username: ${user.username.padEnd(25)} Display: ${user.displayName.padEnd(20)}`);
      });
      if (createdUsers.length > 10) {
        console.log(`... and ${createdUsers.length - 10} more`);
      }
    }

    if (failedUsers.length > 0) {
      console.log('\nFailed Users:');
      console.log('----------------------------');
      failedUsers.forEach(user => {
        console.log(`Username: ${user.username} - Reason: ${user.reason}`);
      });
    }

  } catch (error) {
    console.error('Error creating mock users:', error);
    process.exit(1);
  }
}

// Run the script
createMockUsers();
