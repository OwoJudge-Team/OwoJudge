// This script is intended to be run inside the docker container
// Usage: node scripts/create-user.js <username> <displayName> <password> <role> [studentId]

const ADMIN_USERNAME = process.env.ROOT_USERNAME || process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWD || process.env.ADMIN_PASSWORD || 'admin1234';
const API_URL = process.env.API_URL || 'http://localhost:8787';

const create_user = async (username, displayName, password, role, studentId) => {
  if (role !== 'student' && role !== 'ta' && role !== 'judgeAdmin') {
    console.log("Error: The role should be 'student', 'ta', or 'judgeAdmin'");
    process.exit(1);
  }

  const newUser = {
    username,
    displayName,
    role: role,
    password: password
  };

  if (studentId) {
    newUser.studentId = studentId;
  }

  if (!ADMIN_USERNAME) {
    console.log("Error: Cannot find admin username");
    process.exit(1);
  }
  if (!ADMIN_PASSWORD) {
    console.log("Error: Cannot find admin password");
    process.exit(1);
  }

  console.log(`Logging in as ${ADMIN_USERNAME} at ${API_URL}...`);
  try {
    const login_response = await fetch(`${API_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    });

    if (!login_response.ok) {
        console.log(`Login failed: ${login_response.status} ${login_response.statusText}`);
        process.exit(1);
    }

    const cookies = login_response.headers.get('set-cookie');
    
    console.log(`Creating user ${username}...`);
    const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
        },
        body: JSON.stringify(newUser)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    console.log('User created successfully:', data);
    return data;

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length < 4) {
  console.log("Usage: node create-user.js <username> <displayName> <password> <role> [studentId]");
  process.exit(1);
}

const [username, displayName, password, role, studentId] = args;

create_user(username, displayName, password, role, studentId);