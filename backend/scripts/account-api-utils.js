const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DEFAULT_API_URL = process.env.API_URL || 'http://localhost:8787/api';

function getApiUrl() {
  return process.env.API_URL || DEFAULT_API_URL;
}

async function login(username, password, apiUrl = getApiUrl()) {
  const response = await fetch(`${apiUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${username}: ${response.status}`);
  }

  const rawSetCookie = response.headers.get('set-cookie');
  if (!rawSetCookie) {
    throw new Error(`Login failed for ${username}: missing Set-Cookie header`);
  }

  return rawSetCookie.split(';')[0];
}

function getAdminPasswordCandidates() {
  const out = [];

  if (process.env.ADMIN_PASSWD) out.push(process.env.ADMIN_PASSWD);
  if (process.env.ADMIN_PASSWORD) out.push(process.env.ADMIN_PASSWORD);

  const credentialFiles = [
    path.join(process.cwd(), 'admin-credentials.json'),
    '/app/admin-credentials.json'
  ];

  for (const filePath of credentialFiles) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed && parsed.password) out.push(String(parsed.password));
    } catch (_error) {
      // Ignore malformed credentials file
    }
  }

  out.push('adminpassword', 'admin1234');
  return [...new Set(out.filter(Boolean))];
}

async function loginAdminWithFallback(apiUrl = getApiUrl()) {
  const adminUsername = process.env.ROOT_USERNAME || process.env.ADMIN_USERNAME || 'admin';
  const candidates = getAdminPasswordCandidates();

  let lastError;
  for (const password of candidates) {
    try {
      const cookie = await login(adminUsername, password, apiUrl);
      return { adminUsername, cookie };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Unable to login as ${adminUsername}`);
}

async function createUserViaApi(userData, adminCookie, apiUrl = getApiUrl()) {
  const response = await fetch(`${apiUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} - ${text}`);
  }

  return response.json();
}

module.exports = {
  getApiUrl,
  login,
  loginAdminWithFallback,
  createUserViaApi
};
