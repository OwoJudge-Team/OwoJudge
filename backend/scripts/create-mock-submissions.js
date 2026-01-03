const mongoose = require('mongoose');

// Submission Status Enum
const SubmissionStatus = {
  PD: 'pending',
  QU: 'in queue',
  AC: 'Accepted',
  WA: 'Wrong Answer',
  PE: 'Presentation Error',
  PS: 'Partially Scored',
  CE: 'Compilation Error',
  RE: 'Runtime Error',
  MLE: 'Memory Limit Exceeded',
  TLE: 'Time Limit Exceeded',
  PLE: 'Process Limit Exceeded',
  SE: 'System Error'
};

// Schemas
const userSchema = new mongoose.Schema({
  username: String,
  displayName: String,
  // ... other fields not needed for reference
});

const problemSchema = new mongoose.Schema({
  serialNumber: Number,
  title: String,
  testcase: [{
    filename: String,
    point: Number,
    subtask: String
  }]
});

const userSolutionSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: false });

const testCaseResultSchema = new mongoose.Schema({
  testcase: { type: String, required: true },
  status: { type: String, enum: Object.values(SubmissionStatus), required: true },
  time: { type: Number, required: true },
  memory: { type: Number, required: true },
  message: { type: String }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  serialNumber: { type: Number, unique: true },
  problemSerialNumber: { type: Number, required: true },
  problemTitle: { type: String, required: true },
  username: { type: String, required: true },
  userHandle: { type: String, required: true },
  userID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  language: { type: String, required: true },
  userSolution: [userSolutionSchema],
  status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.PD },
  createdTime: { type: Date, default: Date.now },
  score: { type: Number, default: 0 },
  results: { type: mongoose.Schema.Types.Mixed, default: {} },
});

// Auto-increment serialNumber
submissionSchema.pre('save', async function(next) {
  if (this.isNew && !this.serialNumber) {
    try {
      const lastSubmission = await mongoose.model('Submission').findOne(
        {}, 
        { serialNumber: 1 }, 
        { sort: { serialNumber: -1 } }
      );
      
      this.serialNumber = lastSubmission?.serialNumber 
        ? lastSubmission.serialNumber + 1 
        : 1000000;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const User = mongoose.model('User', userSchema);
const Problem = mongoose.model('Problem', problemSchema);
const Submission = mongoose.model('Submission', submissionSchema);

// Helper functions
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const languages = ['C++', 'Python', 'Java', 'JavaScript', 'C'];
const codeSnippets = {
  'C++': '#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}',
  'Python': 'import sys\n\nfor line in sys.stdin:\n    a, b = map(int, line.split())\n    print(a + b)',
  'Java': 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}',
  'JavaScript': 'const fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim().split("\\n");\nconst [a, b] = input[0].split(" ").map(Number);\nconsole.log(a + b);',
  'C': '#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}'
};

function generateRandomStatus() {
  const rand = Math.random();
  if (rand < 0.4) return SubmissionStatus.AC;
  if (rand < 0.5) return SubmissionStatus.PS;
  if (rand < 0.7) return SubmissionStatus.WA;
  if (rand < 0.8) return SubmissionStatus.TLE;
  if (rand < 0.85) return SubmissionStatus.RE;
  if (rand < 0.9) return SubmissionStatus.CE;
  if (rand < 0.95) return SubmissionStatus.MLE;
  return SubmissionStatus.PLE;
}

// Main function
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 20;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

async function createMockSubmissions() {
  try {
    console.log(`Creating ${count} mock submissions...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    const problems = await Problem.find({});

    if (users.length === 0) {
      console.error('No users found! Please run create-mock-users.js first.');
      process.exit(1);
    }

    if (problems.length === 0) {
      console.error('No problems found! Please run create-mock-problems.js first.');
      process.exit(1);
    }

    const createdSubmissions = [];

    for (let i = 0; i < count; i++) {
      const user = getRandomElement(users);
      const problem = getRandomElement(problems);
      const language = getRandomElement(languages);
      const status = generateRandomStatus();
      
      let score = 0;
      if (status === SubmissionStatus.AC) {
        score = 100;
      } else if (status === SubmissionStatus.PS) {
        score = Math.floor(Math.random() * 100);
      }

      // Generate results based on problem testcases
      const results = {};
      let testcases = problem.testcase;

      // If no testcases defined in DB, generate fake ones
      if (!testcases || testcases.length === 0) {
        testcases = [];
        const numTests = Math.floor(Math.random() * 6) + 3; // 3-8 tests
        for (let t = 1; t <= numTests; t++) {
          testcases.push({
            filename: `${String(t).padStart(2, '0')}`,
            point: 10, // Assign some points
            subtask: 'main'
          });
        }
      }

      // Group testcases by subtask
      const groupedTCs = {};
      for (const tc of testcases) {
          const subtask = tc.subtask || 'main';
          if (!groupedTCs[subtask]) groupedTCs[subtask] = [];
          groupedTCs[subtask].push(tc);
      }

      for (const [subtask, tcs] of Object.entries(groupedTCs)) {
          const groupResults = [];
          let allAC = true;
          let groupScore = 0;
          let totalGroupPoints = 0;

          for (const tc of tcs) {
            totalGroupPoints += (tc.point || 0);
            let tcStatus = status;
            // If overall status is not AC, mix in some ACs for individual testcases
            if (status !== SubmissionStatus.AC && Math.random() > 0.5) {
               tcStatus = SubmissionStatus.AC;
            }
            // If overall is AC, all must be AC
            if (status === SubmissionStatus.AC) {
              tcStatus = SubmissionStatus.AC;
            }
            
            if (tcStatus !== SubmissionStatus.AC) allAC = false;

            groupResults.push({
              testcase: tc.filename,
              status: tcStatus,
              time: Number((Math.random() * 1).toFixed(3)), // 0-1s
              memory: Math.floor(Math.random() * 1024 * 10), // 0-10MB
              message: tcStatus === SubmissionStatus.AC ? 'Correct' : 'Wrong Answer'
            });
          }
          
          if (allAC) {
              groupScore = totalGroupPoints || 100;
          } else if (status === SubmissionStatus.PS) {
              groupScore = Math.floor(Math.random() * (totalGroupPoints || 100));
          } else {
              groupScore = 0;
          }

          results[subtask] = {
              score: groupScore,
              testcases: groupResults
          };
      }

      const submission = new Submission({
        problemSerialNumber: problem.serialNumber,
        problemTitle: problem.title,
        username: user.username,
        userHandle: user.displayName,
        userID: user._id,
        language: language,
        userSolution: [{
          filename: `main.${language === 'Python' ? 'py' : language === 'JavaScript' ? 'js' : 'cpp'}`,
          content: codeSnippets[language]
        }],
        status: status,
        createdTime: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Last 30 days
        score: score,
        results: results
      });

      await submission.save();
      createdSubmissions.push(submission);
      console.log(`INFO: Created submission #${submission.serialNumber} for ${problem.title} by ${user.username} (${status})`);
    }

    console.log('\n==========================================');
    console.log('Mock Submissions Creation Summary');
    console.log('==========================================');
    console.log(`Total Requested: ${count}`);
    console.log(`Successfully Created: ${createdSubmissions.length}`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('Error creating mock submissions:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createMockSubmissions();
