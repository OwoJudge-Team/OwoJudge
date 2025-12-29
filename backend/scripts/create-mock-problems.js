const fs = require('fs');
const path = require('path');
const tar = require('tar');
const os = require('os');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8787/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

// Problem templates with various themes
const problemTitles = [
  'Two Sum', 'Reverse String', 'Palindrome Check', 'Binary Search',
  'Merge Sort', 'Quick Sort', 'Fibonacci Sequence', 'Prime Numbers',
  'Longest Common Subsequence', 'Knapsack Problem', 'Tower of Hanoi',
  'Maximum Subarray', 'Coin Change', 'Edit Distance', 'Graph Traversal',
  'Shortest Path', 'Minimum Spanning Tree', 'Topological Sort',
  'Matrix Multiplication', 'String Matching', 'Array Rotation',
  'Stack Implementation', 'Queue Implementation', 'Binary Tree Traversal',
  'Heap Sort', 'Hash Table', 'Dynamic Programming', 'Greedy Algorithm',
  'Backtracking', 'Divide and Conquer', 'Sliding Window', 'Two Pointers',
  'Bit Manipulation', 'Recursion', 'Memoization', 'Trie Implementation',
  'Segment Tree', 'Fenwick Tree', 'Union Find', 'Game Theory'
];

const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];

const tagOptions = [
  ['array', 'sorting'],
  ['string', 'string-matching'],
  ['dynamic-programming', 'optimization'],
  ['graph', 'shortest-path'],
  ['tree', 'traversal'],
  ['math', 'number-theory'],
  ['greedy', 'optimization'],
  ['data-structure', 'implementation'],
  ['search', 'binary-search'],
  ['recursion', 'divide-conquer'],
  ['dp', 'memoization'],
  ['graph', 'dfs', 'bfs'],
  ['stack', 'monotonic-stack'],
  ['queue', 'simulation'],
  ['hash-table', 'lookup'],
  ['bit-manipulation', 'bitwise'],
  ['two-pointers', 'sliding-window'],
  ['backtracking', 'brute-force'],
  ['segment-tree', 'range-query'],
  ['trie', 'prefix-tree']
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function generateRandomTitle(index) {
  if (index < problemTitles.length) {
    return problemTitles[index];
  }
  const difficulty = getRandomElement(difficulties);
  const baseTitle = getRandomElement(problemTitles);
  return `${baseTitle} ${difficulty} ${index}`;
}

function generateRandomProblem(index) {
  const title = generateRandomTitle(index);
  // Use a random string for directory name, but it won't be the ID
  const dirName = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  const timeLimit = [1000, 2000, 3000, 5000][Math.floor(Math.random() * 4)]; // 1-5 seconds
  const memoryLimit = [256, 512, 1024][Math.floor(Math.random() * 3)]; // 256MB-1GB
  const processes = Math.random() > 0.9 ? 2 : 1; // 10% chance of multi-process
  const scorePolicy = ['sum', 'max'][Math.floor(Math.random() * 2)];
  const tags = getRandomElements(tagOptions.flat(), Math.floor(Math.random() * 3) + 2);
  const problemRelatedTags = getRandomElements(difficulties, 1);
  
  return {
    dirName,
    title,
    timeLimit,
    memoryLimit,
    processes,
    fullScore: 100,
    scorePolicy,
    tags,
    problemRelatedTags,
    createdTime: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)) // Random date in last year
  };
}

// Get command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 10;

// Paths
const TEMPLATE_PATH = path.join(__dirname, '../docs/example/tps-example');

// Helper to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function login() {
  try {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    // Get cookies
    const cookies = response.headers.get('set-cookie');
    return cookies;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function createMockProblems() {
  try {
    console.log(`Creating ${count} mock problems via API...`);
    
    const cookie = await login();
    console.log('Logged in successfully');

    const createdProblems = [];
    const failedProblems = [];

    for (let i = 0; i < count; i++) {
      let tempDir = null;
      try {
        const problemData = generateRandomProblem(i);
        
        // Create temp dir
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-problem-'));
        const problemDir = path.join(tempDir, problemData.dirName);
        
        if (fs.existsSync(TEMPLATE_PATH)) {
          // Copy template
          copyDir(TEMPLATE_PATH, problemDir);
          
          // Update problem.json
          const problemJsonPath = path.join(problemDir, 'problem.json');
          if (fs.existsSync(problemJsonPath)) {
            const problemJson = JSON.parse(fs.readFileSync(problemJsonPath, 'utf-8'));
            
            problemJson.code = problemData.dirName; // Still needed for internal structure but ignored by DB
            problemJson.title = problemData.title;
            problemJson.score_policy = problemData.scorePolicy;
            problemJson.tags = problemData.tags;
            problemJson.problemRelatedTags = problemData.problemRelatedTags;
            problemJson.time_limit = problemData.timeLimit / 1000; // Convert ms to s
            problemJson.memory_limit = problemData.memoryLimit;
            problemJson.process_limit = problemData.processes;
            
            fs.writeFileSync(problemJsonPath, JSON.stringify(problemJson, null, 4));
          }
          
          // Update description.md
          const descPath = path.join(problemDir, 'statement/description.md');
          if (fs.existsSync(descPath)) {
            let descContent = fs.readFileSync(descPath, 'utf-8');
            descContent = `# ${problemData.title}\n\n` + descContent.replace(/^# .*\n/, '');
            fs.writeFileSync(descPath, descContent);
          }
          
          // Create tarball
          const tarballPath = path.join(tempDir, `${problemData.dirName}.tar.gz`);
          await tar.c(
            {
              gzip: true,
              file: tarballPath,
              cwd: tempDir
            },
            [problemData.dirName]
          );
          
          // Upload
          const formData = new FormData();
          const fileContent = fs.readFileSync(tarballPath);
          const blob = new Blob([fileContent], { type: 'application/gzip' });
          formData.append('problem', blob, `${problemData.dirName}.tar.gz`);
          
          const uploadResp = await fetch(`${API_URL}/problems`, {
            method: 'POST',
            headers: {
              'Cookie': cookie
            },
            body: formData
          });
          
          if (!uploadResp.ok) {
            const text = await uploadResp.text();
            throw new Error(`API Error: ${uploadResp.status} - ${text}`);
          }

          createdProblems.push({
            dirName: problemData.dirName,
            title: problemData.title,
            difficulty: problemData.problemRelatedTags[0] || 'N/A'
          });
          
          console.log(`Info: Created problem ${i + 1}/${count}: ${problemData.title}`);
        } else {
          throw new Error(`Template path not found at ${TEMPLATE_PATH}`);
        }
      } catch (error) {
        failedProblems.push({ index: i, reason: error.message });
        console.log(`Error: Failed to create problem ${i + 1}/${count}: ${error.message}`);
      } finally {
        // Cleanup
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    }

    console.log('\n==========================================');
    console.log('Mock Problems Creation Summary');
    console.log('==========================================');
    console.log(`Total Requested: ${count}`);
    console.log(`Successfully Created: ${createdProblems.length}`);
    console.log(`Failed: ${failedProblems.length}`);
    console.log('==========================================\n');

    if (createdProblems.length > 0) {
      console.log('Created Problems:');
      console.log('----------------------------');
      createdProblems.forEach(problem => {
        console.log(`${problem.dirName.padEnd(35)} ${problem.title.padEnd(35)} [${problem.difficulty.padEnd(6)}]`);
      });
    }

    if (failedProblems.length > 0) {
      console.log('\nFailed Problems:');
      console.log('----------------------------');
      failedProblems.forEach(problem => {
        console.log(`Index: ${problem.index} - Reason: ${problem.reason}`);
      });
    }

  } catch (error) {
    console.error('Error creating mock problems:', error);
    process.exit(1);
  }
}

// Run the script
createMockProblems();
