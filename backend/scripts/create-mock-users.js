const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Define the User schema
const userSchema = new mongoose.Schema({
  username: {
    type: mongoose.Schema.Types.String,
    require: true,
    unique: true
  },
  displayName: {
    type: mongoose.Schema.Types.String,
    require: true
  },
  password: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  isAdmin: {
    type: mongoose.Schema.Types.Boolean,
    required: true
  },
  solvedProblem: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  solvedProblems: {
    type: mongoose.Schema.Types.Array,
    required: true
  },
  rating: {
    type: mongoose.Schema.Types.Number,
    required: true
  }
});

const User = mongoose.model('User', userSchema);

// Hash function
let salt;

const readSalt = () => {
  try {
    const saltPath = path.join(__dirname, '../salt.json');
    const SALT = JSON.parse(fs.readFileSync(saltPath, 'utf-8')).salt;
    salt = SALT;
  } catch (error) {
    const saltPath = path.join(__dirname, '../salt.json');
    salt = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(saltPath, JSON.stringify({ salt }, null, 4));
  }
};

const hashString = (str) => {
  if (!salt) {
    readSalt();
  }
  return crypto.scryptSync(str, salt, 32).toString('hex');
};

// Random name generators
const firstNames = [
  'Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
  'Iris', 'Jack', 'Kate', 'Leo', 'Maria', 'Noah', 'Olivia', 'Peter',
  'Quinn', 'Rachel', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yuki', 'Zara', 'Alex', 'Bella', 'Chris', 'Diana'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Hall'
];

const adjectives = [
  'Cool', 'Fast', 'Smart', 'Brave', 'Swift', 'Clever', 'Mighty', 'Sharp',
  'Quick', 'Bright', 'Bold', 'Pro', 'Super', 'Epic', 'Ninja', 'Cyber',
  'Code', 'Tech', 'Dev', 'Hack'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomUsername() {
  const pattern = Math.floor(Math.random() * 3);
  switch (pattern) {
    case 0:
      // firstname_lastname123
      return `${getRandomElement(firstNames).toLowerCase()}_${getRandomElement(lastNames).toLowerCase()}${Math.floor(Math.random() * 1000)}`;
    case 1:
      // adjective_firstname
      return `${getRandomElement(adjectives).toLowerCase()}_${getRandomElement(firstNames).toLowerCase()}`;
    case 2:
      // firstname + random number
      return `${getRandomElement(firstNames).toLowerCase()}${Math.floor(Math.random() * 10000)}`;
    default:
      return `user${Math.floor(Math.random() * 100000)}`;
  }
}

function generateRandomDisplayName() {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

function generateRandomRating() {
  // Generate ratings between 0 and 3000 with bias towards middle range
  const base = Math.random() * 3000;
  return Math.floor(base);
}

function generateSolvedProblems() {
  const count = Math.floor(Math.random() * 50); // 0 to 50 solved problems
  const problems = [];
  for (let i = 0; i < count; i++) {
    problems.push(Math.floor(Math.random() * 1000) + 1);
  }
  return [...new Set(problems)]; // Remove duplicates
}

// Get command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 10;
const password = args[1] || 'password123'; // Default password for all mock users

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

async function createMockUsers() {
  try {
    console.log(`Creating ${count} mock users...`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const createdUsers = [];
    const failedUsers = [];

    for (let i = 0; i < count; i++) {
      try {
        const username = generateRandomUsername();
        const displayName = generateRandomDisplayName();
        const solvedProblems = generateSolvedProblems();
        const rating = generateRandomRating();
        
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        
        if (existingUser) {
          failedUsers.push({ username, reason: 'Already exists' });
          continue;
        }

        // Create mock user object
        const mockUser = new User({
          username,
          displayName,
          password: hashString(password),
          isAdmin: false,
          solvedProblem: solvedProblems.length,
          solvedProblems: solvedProblems,
          rating: rating
        });

        await mockUser.save();
        createdUsers.push({
          username,
          displayName,
          rating,
          solvedCount: solvedProblems.length
        });
        
        console.log(`INFO: Created user ${i + 1}/${count}: ${username}`);
      } catch (error) {
        failedUsers.push({ username: `user_${i}`, reason: error.message });
        console.log(`✗ Failed to create user ${i + 1}/${count}: ${error.message}`);
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
      console.log('Created Users:');
      console.log('----------------------------');
      createdUsers.forEach(user => {
        console.log(`Username: ${user.username.padEnd(25)} Display: ${user.displayName.padEnd(20)} Rating: ${user.rating.toString().padEnd(6)} Solved: ${user.solvedCount}`);
      });
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
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createMockUsers();
