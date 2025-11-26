#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import mongoose from 'mongoose';

console.log('🔍 Complete Authentication Diagnosis\n');
console.log('═══════════════════════════════════════════════════════\n');

const testPassword = 'password123';
const testUsername = 'testuser';

// Step 1: Check salt.json
console.log('Step 1: Checking salt.json file...');
const saltPath = './salt.json';
const saltContent = fs.readFileSync(saltPath, 'utf-8');
const saltData = JSON.parse(saltContent);
const salt = saltData.salt;
console.log(`✅ Salt found: ${salt.substring(0, 20)}...`);
console.log('');

// Step 2: Hash the test password
console.log('Step 2: Hashing test password...');
const hashedPassword = crypto.scryptSync(testPassword, salt, 32).toString('hex');
console.log(`   Password: "${testPassword}"`);
console.log(`   Hashed:   ${hashedPassword}`);
console.log('');

// Step 3: Check database
console.log('Step 3: Checking database...');
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  displayName: String,
});
const User = mongoose.model('User', userSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

async function diagnose() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const user = await User.findOne({ username: testUsername });
  
  if (!user) {
    console.log('❌ User not found in database!');
    return;
  }

  console.log(`User found:`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Display:  ${user.displayName}`);
  console.log(`   DB Hash:  ${user.password}`);
  console.log('');

  // Step 4: Compare hashes
  console.log('Step 4: Comparing password hashes...');
  console.log(`   Expected: ${hashedPassword}`);
  console.log(`   In DB:    ${user.password}`);
  
  if (user.password === hashedPassword) {
    console.log('   ✅ MATCH! Password should work.\n');
  } else {
    console.log('   ❌ NO MATCH! Password will fail.\n');
    console.log('   Action: Recreate user with correct hash:');
    console.log('   $ node scripts/delete-user.js testuser');
    console.log('   $ node scripts/create-test-user.js\n');
  }

  // Step 5: Test the hash function from utils
  console.log('Step 5: Testing backend hash function...');
  const { hashString, stringMatch } = await import('../src/utils/hash-password.js');
  
  const backendHash = hashString(testPassword);
  console.log(`   Backend hashed: ${backendHash}`);
  console.log(`   Script hashed:  ${hashedPassword}`);
  
  if (backendHash === hashedPassword) {
    console.log('   ✅ Backend hash function works correctly!\n');
  } else {
    console.log('   ❌ Backend hash function produces different result!\n');
    console.log('   This means backend is using a different salt!');
    console.log('   The backend might need to be restarted.\n');
  }

  // Step 6: Test stringMatch
  console.log('Step 6: Testing stringMatch function...');
  const matches = stringMatch(testPassword, user.password);
  console.log(`   stringMatch("${testPassword}", dbHash) = ${matches}`);
  
  if (matches) {
    console.log('   ✅ stringMatch works! Login should succeed.\n');
  } else {
    console.log('   ❌ stringMatch fails! This is why login fails.\n');
    console.log('   SOLUTION: Restart the backend server!');
    console.log('   The backend may have cached an old salt value.\n');
  }

  await mongoose.disconnect();
}

await diagnose();

console.log('═══════════════════════════════════════════════════════');
console.log('\nRECOMMENDATIONS:');
console.log('1. Make sure backend server is running from /backend directory');
console.log('2. Restart the backend server after creating users');
console.log('3. Check that salt.json exists in /backend directory');
console.log('═══════════════════════════════════════════════════════');
