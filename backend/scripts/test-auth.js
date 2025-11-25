#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';

console.log('🔍 Testing Password Hash System\n');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: Read salt from both possible locations
console.log('Test 1: Checking salt.json locations...');

let scriptSalt, backendSalt;

// Script location (old)
try {
  const scriptPath = './salt.json';
  scriptSalt = JSON.parse(fs.readFileSync(scriptPath, 'utf-8')).salt;
  console.log(`✅ Found salt in current directory (./salt.json)`);
  console.log(`   Salt (first 20 chars): ${scriptSalt.substring(0, 20)}...`);
} catch (error) {
  console.log(`❌ No salt found in ./salt.json`);
}

// Backend location (correct)
try {
  const backendPath = new URL('../salt.json', import.meta.url).pathname;
  backendSalt = JSON.parse(fs.readFileSync(backendPath, 'utf-8')).salt;
  console.log(`✅ Found salt in backend directory (../salt.json)`);
  console.log(`   Salt (first 20 chars): ${backendSalt.substring(0, 20)}...`);
} catch (error) {
  console.log(`❌ No salt found in ../salt.json`);
}

console.log('\n');

// Test 2: Compare salts
if (scriptSalt && backendSalt) {
  if (scriptSalt === backendSalt) {
    console.log('✅ Both salts are IDENTICAL (Good!)');
  } else {
    console.log('❌ Salts are DIFFERENT (This is the problem!)');
  }
} else if (backendSalt) {
  console.log('✅ Using backend salt (correct)');
}

console.log('\n');

// Test 3: Hash the test password with backend salt
const testPassword = 'password123';
const hashWithBackendSalt = crypto.scryptSync(testPassword, backendSalt, 32).toString('hex');

console.log(`Test 2: Hashing test password "${testPassword}"`);
console.log(`   Hash result: ${hashWithBackendSalt}`);

console.log('\n');

// Test 4: Check database for testuser
console.log('Test 3: Checking database for testuser...\n');

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  displayName: String,
  isAdmin: Boolean,
});

const User = mongoose.model('User', userSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/judge';

async function checkDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ username: 'testuser' });
    
    if (!user) {
      console.log('❌ User "testuser" not found in database!');
      console.log('   Run: node scripts/create-test-user.js');
    } else {
      console.log('✅ Found user "testuser" in database');
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Password Hash (in DB): ${user.password}`);
      console.log(`   Expected Hash:         ${hashWithBackendSalt}`);
      console.log('');
      
      if (user.password === hashWithBackendSalt) {
        console.log('✅ Password hash MATCHES! Login should work.');
      } else {
        console.log('❌ Password hash DOES NOT MATCH!');
        console.log('   This is why login fails.');
        console.log('   Solution: Delete and recreate the user:');
        console.log('   node scripts/delete-user.js testuser');
        console.log('   node scripts/create-test-user.js');
      }
    }
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

await checkDatabase();

console.log('\n═══════════════════════════════════════════════════════');
