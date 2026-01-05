const path = require('path');
const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8787/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aaaaaaaa';

// Contest Configuration
const CONTEST_COUNT = process.argv[2] ? parseInt(process.argv[2]) : 5;

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

async function login() {
  console.log(`Logging in as ${ADMIN_USERNAME}...`);
  try {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    // Get cookies from response
    const cookies = response.headers.get('set-cookie');
    return cookies;
  } catch (error) {
    console.error('Login error:', error);
    process.exit(1);
  }
}

async function getProblems(cookie) {
  console.log('Fetching existing problems...');
  try {
    const response = await fetch(`${API_URL}/problems?limit=100`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch problems: ${response.statusText}`);
    }

    const data = await response.json();
    // Handle both array and paginated response formats
    const problems = Array.isArray(data) ? data : (data.docs || data.problems || []);
    
    if (problems.length === 0) {
      console.warn('No problems found. Contests will be created without problems.');
    } else {
      console.log(`Found ${problems.length} problems.`);
    }
    
    return problems;
  } catch (error) {
    console.error('Error fetching problems:', error);
    return [];
  }
}

function generateRandomContest(index, problems) {
  const id = `mock-contest-${Date.now()}-${index}`;
  
  // Random start time: from 30 days ago to 30 days in future
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const startTimeMs = now - thirtyDays + Math.random() * (thirtyDays * 2);
  const durationMs = (Math.floor(Math.random() * 5) + 1) * 60 * 60 * 1000; // 1-5 hours
  
  const startTime = new Date(startTimeMs);
  const endTime = new Date(startTimeMs + durationMs);
  
  // Select 3-8 random problems
  const contestProblems = [];
  if (problems.length > 0) {
    const selectedProblems = getRandomElements(problems, Math.floor(Math.random() * 6) + 3);
    selectedProblems.forEach(p => {
      contestProblems.push({
        serialNumber: p.serialNumber,
        score: Math.floor(Math.random() * 10) * 10 + 100 // 100-190
      });
    });
  }

  return {
    contestID: id,
    title: `Mock Contest ${index} - ${startTime.toISOString().split('T')[0]}`,
    description: `This is a generated mock contest #${index}.\n\nStart Time: ${startTime.toLocaleString()}\nDuration: ${durationMs / 3600000} hours.`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    problems: contestProblems,
    visibility: 'public' // or 'private' randomly?
  };
}

async function createContest(contest, cookie) {
  try {
    const response = await fetch(`${API_URL}/contests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      body: JSON.stringify(contest),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create contest ${contest.contestID}: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log(`Created contest: ${contest.title} (${contest.contestID})`);
    return data;
  } catch (error) {
    console.error(`Error creating contest ${contest.contestID}:`, error.message);
    return null;
  }
}

async function main() {
  console.log(`Starting mock contest generation... Target: ${CONTEST_COUNT} contests.`);
  
  const cookie = await login();
  const problems = await getProblems(cookie);
  
  let successCount = 0;
  
  for (let i = 1; i <= CONTEST_COUNT; i++) {
    const contest = generateRandomContest(i, problems);
    const result = await createContest(contest, cookie);
    if (result) successCount++;
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nFinished! Successfully created ${successCount}/${CONTEST_COUNT} contests.`);
}

main().catch(console.error);
