#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8787/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aaaaaaaa';

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0];

if (!username) {
  console.error('Error: Please provide a username to delete');
  console.log('Usage: node delete-user.js <username>');
  process.exit(1);
}

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

async function deleteUserViaAPI(username, cookie) {
  try {
    const response = await fetch(`${API_URL}/users/${username}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookie
      }
    });

    if (response.status === 404) {
      throw new Error(`User '${username}' not found`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function deleteUser() {
  try {
    console.log(`Deleting user '${username}' via API...`);

    const cookie = await login();
    const result = await deleteUserViaAPI(username, cookie);

    console.log(`Info: User '${username}' deleted successfully!`);
  } catch (error) {
    console.error('Error deleting user:', error.message);
    process.exit(1);
  }
}

// Run the script
deleteUser();
