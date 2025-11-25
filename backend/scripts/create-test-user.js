#!/usr/bin/env node

import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';

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
    // Use absolute path relative to the backend directory
    const saltPath = new URL('../salt.json', import.meta.url).pathname;
    const SALT = JSON.parse(fs.readFileSync(saltPath, 'utf-8')).salt;
    salt = SALT;
  } catch (error) {
    const saltPath = new URL('../salt.json', import.meta.url).pathname;
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

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0] || 'testuser';
const password = args[1] || 'password123';
const displayName = args[2] || 'Test User';
const isAdmin = args[3] === 'true';

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      console.log(`User '${username}' already exists!`);
      console.log('Please choose a different username or delete the existing user first.');
      return;
    }

    // Create test user object
    const testUser = new User({
      username,
      displayName,
      password: hashString(password),
      isAdmin,
      solvedProblem: 0,
      solvedProblems: [],
      rating: 1200
    });

    await testUser.save();
    
    console.log('\n✅ Test user created successfully!');
    console.log('═══════════════════════════════════');
    console.log(`Username:     ${username}`);
    console.log(`Password:     ${password}`);
    console.log(`Display Name: ${displayName}`);
    console.log(`Admin:        ${isAdmin}`);
    console.log(`Rating:       1200`);
    console.log('═══════════════════════════════════');
    console.log('\nYou can now login with these credentials!');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createTestUser();
