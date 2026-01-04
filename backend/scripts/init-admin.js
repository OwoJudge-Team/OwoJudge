#!/usr/bin/env node

import mongoose from 'mongoose';

// Define the User schema and model directly in this script
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
  },
  gitPublicKey: {
    type: mongoose.Schema.Types.String,
    required: false
  },
  studentId: {
    type: mongoose.Schema.Types.String,
    required: false,
    unique: true,
    sparse: true
  },
  giteaId: {
    type: mongoose.Schema.Types.Number,
    required: false,
    unique: true,
    sparse: true
  }
});

const User = mongoose.model('User', userSchema);

// Hash function - simplified version for this script
import crypto from 'crypto';
import fs from 'fs';

let salt;

const readSalt = () => {
  try {
    const SALT = JSON.parse(fs.readFileSync('./salt.json', 'utf-8')).salt;
    salt = SALT;
  } catch (error) {
    salt = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync('./salt.json', JSON.stringify({ salt }, null, 4));
  }
};

const hashString = (str) => {
  if (!salt) {
    readSalt();
  }
  return crypto.scryptSync(str, salt, 32).toString('hex');
};

const randomString = (size) => {
  return crypto.randomBytes(size).toString('hex');
};

// Get environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';
const ROOT_USERNAME = process.env.ROOT_USERNAME || 'admin';

async function createAdminUser() {
  try {
    console.log('Initializing admin user...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: ROOT_USERNAME });

    if (existingAdmin) {
      const newPass = process.env.ADMIN_PASSWD;
      if (!newPass) {
        console.log('Admin user already exists. To change the password set ADMIN_PASSWD and re-run the script.');
        return;
      }

      existingAdmin.password = hashString(newPass);
      await existingAdmin.save();

      console.log('Admin password updated successfully!');
      console.log('Admin User Details:');
      console.log(`Username: ${ROOT_USERNAME}`);
      console.log('Password: (from ADMIN_PASSWD environment variable)');
      console.log('IMPORTANT: Save this password securely!');

      try {
        const credPath = './admin-credentials.json';
        const credentials = {
          username: ROOT_USERNAME,
          password: newPass,
          userId: existingAdmin._id?.toString?.() || String(existingAdmin._id),
          updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
        console.log(`Credentials written to ${credPath} (permissions 600)`);
      } catch (writeErr) {
        console.error('Failed to write credentials file:', writeErr);
      }
      return;
    }

    // Generate random password for admin user
    const adminPassword = process.env.ADMIN_PASSWD || randomString(12);
    
    // Create admin user object
    const adminUser = new User({
      username: ROOT_USERNAME,
      displayName: `${ROOT_USERNAME.charAt(0).toUpperCase()}${ROOT_USERNAME.slice(1)} Administrator`,
      password: hashString(adminPassword),
      isAdmin: true,
      solvedProblem: 0,
      solvedProblems: [],
      rating: 0
    });

    const savedUser = await adminUser.save();

    console.log('Admin user created successfully!');
    console.log('Admin User Details:');
    console.log(`Username: ${ROOT_USERNAME}`);
    console.log(`Password: ${adminPassword}`);
    console.log('IMPORTANT: Save these credentials securely!');
    console.log('The password will not be displayed again.');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser();
