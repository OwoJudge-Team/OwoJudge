#!/usr/bin/env node

import mongoose from 'mongoose';

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

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0] || 'testuser';

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

async function deleteUser() {
  try {
    console.log(`Deleting user '${username}'...`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete user
    const result = await User.deleteOne({ username });
    
    if (result.deletedCount === 0) {
      console.log(`Error: User '${username}' not found!`);
    } else {
      console.log(`Info: User '${username}' deleted successfully!`);
    }
  } catch (error) {
    console.error('Error: deleting user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
deleteUser();
