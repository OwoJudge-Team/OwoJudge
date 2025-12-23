const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Define the Problem schema
const problemSchema = new mongoose.Schema({
  serialNumber: { type: Number, unique: true },
  problemID: { type: String, required: true },
  createdTime: { type: Date, required: true, default: Date.now },
  title: { type: String, required: true },
  timeLimit: { type: Number, required: true },
  memoryLimit: { type: Number, required: true },
  processes: { type: Number, required: true, default: 1 },
  fullScore: { type: Number, required: true },
  scorePolicy: { type: String, required: true, enum: ['sum', 'max', 'min'] },
  tags: [String],
  problemRelatedTags: [String],
  submissionDetail: {
    accepted: { type: Number, default: 0 },
    submitted: { type: Number, default: 0 },
    timeLimitExceeded: { type: Number, default: 0 },
    memoryLimitExceeded: { type: Number, default: 0 },
    wrongAnswer: { type: Number, default: 0 },
    runtimeError: { type: Number, default: 0 },
    compilationError: { type: Number, default: 0 },
    processLimitExceeded: { type: Number, default: 0 }
  },
  userDetail: {
    solved: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 }
  }
});

// Auto-increment serialNumber using pre-save hook
problemSchema.pre('save', async function(next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const lastProblem = await mongoose.model('Problem').findOne(
        {}, 
        { serialNumber: 1 }, 
        { sort: { serialNumber: -1 } }
      );
      
      this.serialNumber = lastProblem?.serialNumber !== undefined
        ? lastProblem.serialNumber + 1 
        : 0;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Problem = mongoose.model('Problem', problemSchema);

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

function generateProblemID(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSubmissionStats() {
  const attempted = Math.floor(Math.random() * 1000);
  const solved = Math.floor(attempted * (0.2 + Math.random() * 0.5)); // 20-70% solve rate
  
  const submitted = attempted * 2 + Math.floor(Math.random() * 500);
  const accepted = solved + Math.floor(Math.random() * submitted * 0.1);
  const wrongAnswer = Math.floor(submitted * (0.3 + Math.random() * 0.3));
  const timeLimitExceeded = Math.floor(submitted * (0.1 + Math.random() * 0.2));
  const memoryLimitExceeded = Math.floor(submitted * (0.05 + Math.random() * 0.1));
  const runtimeError = Math.floor(submitted * (0.05 + Math.random() * 0.1));
  const compilationError = Math.floor(submitted * (0.05 + Math.random() * 0.1));
  const processLimitExceeded = Math.floor(submitted * (0.01 + Math.random() * 0.05));
  
  return {
    submissionDetail: {
      submitted,
      accepted,
      wrongAnswer,
      timeLimitExceeded,
      memoryLimitExceeded,
      runtimeError,
      compilationError,
      processLimitExceeded
    },
    userDetail: {
      attempted,
      solved
    }
  };
}

function generateRandomProblem(index) {
  const title = generateRandomTitle(index);
  const problemID = generateProblemID(title);
  const timeLimit = [1000, 2000, 3000, 5000][Math.floor(Math.random() * 4)]; // 1-5 seconds
  const memoryLimit = [256, 512, 1024][Math.floor(Math.random() * 3)]; // 256MB-1GB
  const processes = Math.random() > 0.9 ? 2 : 1; // 10% chance of multi-process
  const scorePolicy = ['sum', 'max'][Math.floor(Math.random() * 2)];
  const tags = getRandomElements(tagOptions.flat(), Math.floor(Math.random() * 3) + 2);
  const problemRelatedTags = getRandomElements(difficulties, 1);
  const stats = generateSubmissionStats();
  
  return {
    problemID,
    title,
    timeLimit,
    memoryLimit,
    processes,
    fullScore: 100,
    scorePolicy,
    tags,
    problemRelatedTags,
    ...stats,
    createdTime: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)) // Random date in last year
  };
}

// Get command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 10;

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

// Paths
const TEMPLATE_PATH = path.join(__dirname, '../docs/example/tps-example');
const PROBLEMS_DIR = path.join(__dirname, '../problems');

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

async function createMockProblems() {
  try {
    console.log(`Creating ${count} mock problems...`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const createdProblems = [];
    const failedProblems = [];

    for (let i = 0; i < count; i++) {
      try {
        const problemData = generateRandomProblem(i);
        
        // Check if problem already exists
        const existingProblem = await Problem.findOne({ problemID: problemData.problemID });
        
        if (existingProblem) {
          failedProblems.push({ problemID: problemData.problemID, reason: 'Already exists' });
          continue;
        }

        const mockProblem = new Problem(problemData);
        await mockProblem.save();
        
        // Create problem directory structure
        const problemDir = path.join(PROBLEMS_DIR, mockProblem.problemID);
        
        if (fs.existsSync(TEMPLATE_PATH)) {
          try {
            // Copy template
            copyDir(TEMPLATE_PATH, problemDir);
            
            // Update problem.json
            const problemJsonPath = path.join(problemDir, 'problem.json');
            if (fs.existsSync(problemJsonPath)) {
              const problemJson = JSON.parse(fs.readFileSync(problemJsonPath, 'utf-8'));
              
              problemJson.code = mockProblem.problemID;
              problemJson.title = mockProblem.title;
              problemJson.score_policy = mockProblem.scorePolicy;
              problemJson.tags = mockProblem.tags;
              problemJson.problemRelatedTags = mockProblem.problemRelatedTags;
              problemJson.time_limit = mockProblem.timeLimit / 1000; // Convert ms to s
              problemJson.memory_limit = mockProblem.memoryLimit;
              problemJson.process_limit = mockProblem.processes;
              
              fs.writeFileSync(problemJsonPath, JSON.stringify(problemJson, null, 4));
            }
            
            // Update description.md
            const descPath = path.join(problemDir, 'statement/description.md');
            if (fs.existsSync(descPath)) {
              let descContent = fs.readFileSync(descPath, 'utf-8');
              // Replace title if it exists in the markdown, or prepend it
              // Assuming standard markdown title format like "# Title"
              descContent = `# ${mockProblem.title}\n\n` + descContent.replace(/^# .*\n/, '');
              fs.writeFileSync(descPath, descContent);
            }
            
          } catch (err) {
            console.error(`Warning: Failed to setup problem directory for ${mockProblem.problemID}: ${err.message}`);
          }
        } else {
          console.warn(`Warning: Template path not found at ${TEMPLATE_PATH}`);
        }

        createdProblems.push({
          serialNumber: mockProblem.serialNumber,
          problemID: mockProblem.problemID,
          title: mockProblem.title,
          difficulty: mockProblem.problemRelatedTags[0] || 'N/A',
          solved: mockProblem.userDetail.solved,
          attempted: mockProblem.userDetail.attempted
        });
        
        console.log(`Info: Created problem ${i + 1}/${count}: ${mockProblem.title}`);
      } catch (error) {
        failedProblems.push({ problemID: `problem_${i}`, reason: error.message });
        console.log(`Error: Failed to create problem ${i + 1}/${count}: ${error.message}`);
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
        const solveRate = problem.attempted > 0 
          ? ((problem.solved / problem.attempted) * 100).toFixed(1) 
          : '0.0';
        console.log(`#${problem.serialNumber.toString().padStart(4, '0')} ${problem.title.padEnd(35)} [${problem.difficulty.padEnd(6)}] ${problem.solved}/${problem.attempted} (${solveRate}%)`);
      });
    }

    if (failedProblems.length > 0) {
      console.log('\nFailed Problems:');
      console.log('----------------------------');
      failedProblems.forEach(problem => {
        console.log(`ProblemID: ${problem.problemID} - Reason: ${problem.reason}`);
      });
    }

  } catch (error) {
    console.error('Error creating mock problems:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createMockProblems();
