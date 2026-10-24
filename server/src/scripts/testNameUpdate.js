import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const runTest = async () => {
  console.log('--- Testing Multiple Username and Full Name Updates ---');

  try {
    const suffix = Math.floor(Math.random() * 89999 + 10000); // 5 digits
    const u1 = `user_${suffix}`;
    const u2 = `neo_${suffix}`;
    const u3 = `shado_${suffix}`;
    const u4 = `pulse_${suffix}`;

    // 1. Register a test user
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Original Name',
      username: u1,
      email: `${u1}@shado.app`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    console.log('✓ Initial registration:', regRes.data.user.fullName, `(@${regRes.data.user.username})`);
    const token = regRes.data.token;

    // 2. Change full name & username first time
    const update1 = await axios.patch(
      `${API_BASE}/users/me`,
      {
        fullName: 'First Updated Name',
        username: u2,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ 1st Update successful:', update1.data.user.fullName, `(@${update1.data.user.username})`);

    // 3. Change full name & username second time
    const update2 = await axios.patch(
      `${API_BASE}/users/me`,
      {
        fullName: 'Second Updated Name',
        username: u3,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ 2nd Update successful:', update2.data.user.fullName, `(@${update2.data.user.username})`);

    // 4. Change full name & username third time
    const update3 = await axios.patch(
      `${API_BASE}/users/me`,
      {
        fullName: 'Third Updated Name (Infinite Updates)',
        username: u4,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ 3rd Update successful:', update3.data.user.fullName, `(@${update3.data.user.username})`);

    console.log('\n🎉 ALL MULTIPLE USERNAME & FULL NAME UPDATES TESTED AND WORKING! 🎉\n');
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
};

runTest();
