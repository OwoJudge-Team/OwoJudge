const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8787/api';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'password123';

// C code templates for different scenarios
const codeTemplates = {
  correct: `#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`,
  wrongAnswer: `#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a - b);  // Wrong operation
    return 0;
}`,
  runtimeError: `#include <stdio.h>

int main() {
    int *ptr = NULL;
    *ptr = 42;  // Segmentation fault
    return 0;
}`,
  compilationError: `#include <stdio.h>

int main() {
    int a, b
    scanf("%d %d", &a, &b);  // Missing semicolon
    printf("%d\\n", a + b);
    return 0;
}`,
  infiniteLoop: `#include <stdio.h>

int main() {
    while(1) {
        // Infinite loop - will cause TLE
    }
    return 0;
}`
};

// Get command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 20;

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomCode() {
  const rand = Math.random();
  if (rand < 0.6) return codeTemplates.correct;        // 60% correct
  if (rand < 0.8) return codeTemplates.wrongAnswer;    // 20% wrong answer
  if (rand < 0.9) return codeTemplates.runtimeError;   // 10% runtime error
  if (rand < 0.95) return codeTemplates.infiniteLoop;  // 5% TLE
  return codeTemplates.compilationError;                // 5% compilation error
}

async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error(`Login failed for ${username}: ${response.status}`);
    }

    return response.headers.get('set-cookie');
  } catch (error) {
    throw error;
  }
}

async function getUsers(cookie) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { 'Cookie': cookie }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function getProblems(cookie) {
  try {
    const response = await fetch(`${API_URL}/problems`, {
      headers: { 'Cookie': cookie }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch problems: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function createSubmission(submissionData, cookie) {
  try {
    const response = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify(submissionData)
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

async function createMockSubmissions() {
  try {
    console.log(`Creating ${count} mock submissions via API...`);

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';
    console.log(`Logging in as ${ADMIN_USERNAME} to fetch users and problems...`);
    const adminCookie = await login(ADMIN_USERNAME, ADMIN_PASSWORD);

    const users = await getUsers(adminCookie);
    const problems = await getProblems(adminCookie);

    if (users.length === 0) {
      console.error('No users found! Please run create-mock-users.js first.');
      process.exit(1);
    }

    if (problems.length === 0) {
      console.error('No problems found! Please run create-mock-problems.js first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} users and ${problems.length} problems`);

    const createdSubmissions = [];
    const failedSubmissions = [];

    for (let i = 0; i < count; i++) {
      try {
        const user = getRandomElement(users);
        const problem = getRandomElement(problems);

        // Login as the user to create their submission
        const userCookie = await login(user.username, DEFAULT_PASSWORD);

        const submissionData = {
          problemSerialNumber: problem.serialNumber,
          language: 'gcc c17',
          userSolution: [{
            filename: 'main.c',
            content: getRandomCode()
          }]
        };

        const result = await createSubmission(submissionData, userCookie);

        createdSubmissions.push({
          serialNumber: result.serialNumber,
          username: user.username,
          problemSerialNumber: problem.serialNumber,
          problemTitle: problem.title
        });

        console.log(`INFO: Created submission ${i + 1}/${count}: #${result.serialNumber} by ${user.username} for problem ${problem.serialNumber}`);
      } catch (error) {
        failedSubmissions.push({ index: i, reason: error.message });
        console.log(`✗ Failed to create submission ${i + 1}/${count}: ${error.message}`);
      }
    }

    console.log('\n==========================================');
    console.log('Mock Submissions Creation Summary');
    console.log('==========================================');
    console.log(`Total Requested: ${count}`);
    console.log(`Successfully Created: ${createdSubmissions.length}`);
    console.log(`Failed: ${failedSubmissions.length}`);
    console.log('==========================================\n');

    if (createdSubmissions.length > 0) {
      console.log('Created Submissions (showing first 10):');
      console.log('----------------------------');
      createdSubmissions.slice(0, 10).forEach(sub => {
        console.log(`#${sub.serialNumber} - ${sub.username} -> Problem ${sub.problemSerialNumber}: ${sub.problemTitle}`);
      });
      if (createdSubmissions.length > 10) {
        console.log(`... and ${createdSubmissions.length - 10} more`);
      }
    }

    if (failedSubmissions.length > 0) {
      console.log('\nFailed Submissions:');
      console.log('----------------------------');
      failedSubmissions.forEach(sub => {
        console.log(`Submission ${sub.index + 1} - Reason: ${sub.reason}`);
      });
    }

  } catch (error) {
    console.error('Error creating mock submissions:', error.message);
    process.exit(1);
  }
}

createMockSubmissions();
