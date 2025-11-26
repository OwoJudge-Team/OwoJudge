#!/usr/bin/env node

console.log('🧪 Testing Backend Login API\n');
console.log('═══════════════════════════════════════════════════════\n');

const API_URL = process.env.API_URL || 'http://localhost:8787';
const username = process.argv[2] || 'testuser';
const password = process.argv[3] || 'password123';

async function testLogin() {
  try {
    console.log(`Testing login with:`);
    console.log(`  URL: ${API_URL}/api/auth`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}\n`);

    const response = await fetch(`${API_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      console.log('\n✅ Login successful!');
      
      // Test getting auth status
      const cookieHeader = response.headers.get('set-cookie');
      console.log(`\nReceived Cookie: ${cookieHeader ? 'Yes' : 'No'}`);
      
      if (cookieHeader) {
        console.log(`Cookie value: ${cookieHeader.substring(0, 100)}...`);
        
        // Test /api/auth/status with the cookie
        console.log('\nTesting /api/auth/status...');
        const statusResponse = await fetch(`${API_URL}/api/auth/status`, {
          headers: {
            'Cookie': cookieHeader,
          },
        });
        
        if (statusResponse.ok) {
          const userData = await statusResponse.json();
          console.log('✅ Auth status check successful!');
          console.log('User data:', userData);
        } else {
          console.log('❌ Auth status check failed');
        }
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('\n❌ Login failed!');
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.error('\nIs the backend server running?');
    console.error('Run: npm run dev (in backend directory)');
  }
}

testLogin();

console.log('\n═══════════════════════════════════════════════════════');
