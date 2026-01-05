#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8787/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0] || 'b14000000';
const password = args[1] || 'password123';
const displayName = args[2] || 'Test User';
const isAdmin = args[3] === 'true';

async function login() {
  try {
    console.log(`Logging in as ${ADMIN_USERNAME}...`);
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const cookies = response.headers.get('set-cookie');
    console.log('Logged in successfully');
    return cookies;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function createUser(userData, cookie) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function createTestUser() {
  try {
    console.log('Creating test user via API...');

    const cookie = await login();

    const userData = {
      username,
      displayName,
      password,
      isAdmin
    };

    const result = await createUser(userData, cookie);

    console.log('\nTest user created successfully!');
    console.log('-----------------------------------');
    console.log(`Username:     ${username}`);
    console.log(`Password:     ${password}`);
    console.log(`Display Name: ${displayName}`);
    console.log(`Admin:        ${isAdmin}`);
    console.log('-----------------------------------');
    console.log('\nYou can now login with these credentials!');
  } catch (error) {
    console.error('Error creating test user:', error.message);
    process.exit(1);
  }
}

// Run the script
createTestUser();
