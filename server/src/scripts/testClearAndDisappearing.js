import axios from 'axios';
import prisma from '../config/db.js';
import { cleanupExpiredMessages } from '../services/expirationService.js';

const API_BASE = 'http://localhost:5000/api';

const run = async () => {
  console.log('====================================================');
  console.log('🧪 Running SHADO Clear Chat & Disappearing Messages Tests');
  console.log('====================================================\n');

  try {
    const uid = Math.floor(Math.random() * 89999 + 10000);

    // 1. Register User A (Jordan) and User B (Taylor)
    console.log('Step 1: Registering test users...');
    const userARes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Jordan Lee',
      username: `jordan_${uid}`,
      email: `jordan_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const tokenA = userARes.data.token;
    const userA = userARes.data.user;
    console.log(`✓ User A registered: ${userA.fullName} (@${userA.username})`);

    const userBRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Taylor Reed',
      username: `taylor_${uid}`,
      email: `taylor_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const tokenB = userBRes.data.token;
    const userB = userBRes.data.user;
    console.log(`✓ User B registered: ${userB.fullName} (@${userB.username})`);

    // 2. Establish conversation between User A and User B
    console.log('\nStep 2: Creating direct conversation...');
    const convRes = await axios.post(
      `${API_BASE}/conversations`,
      { recipientId: userB.id },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const convId = convRes.data.conversation.id;
    console.log(`✓ Conversation established: ID ${convId}, initial timer: ${convRes.data.conversation.disappearingTimer}`);

    // 3. Test Disappearing Timer Settings & Validation
    console.log('\nStep 3: Testing disappearing timer settings & validation...');
    // Valid options: 5m, 1h, 24h, 7d, 90d, OFF
    for (const validTimer of ['5m', '1h', '24h', '7d', '90d', 'OFF']) {
      const setRes = await axios.patch(
        `${API_BASE}/conversations/${convId}/disappearing`,
        { disappearingTimer: validTimer },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      if (setRes.data.disappearingTimer !== validTimer) {
        throw new Error(`Expected timer to be ${validTimer}, got ${setRes.data.disappearingTimer}`);
      }
    }
    console.log('✓ Successfully set all standard timers: 5m, 1h, 24h, 7d, 90d, OFF');

    // Test invalid timer option
    try {
      await axios.patch(
        `${API_BASE}/conversations/${convId}/disappearing`,
        { disappearingTimer: '15m' },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      throw new Error('Invalid timer did not fail as expected!');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✓ Invalid timer value ("15m") was correctly rejected with HTTP 400');
      } else {
        throw err;
      }
    }

    // 4. Test Disappearing Message Expiration on Send
    console.log('\nStep 4: Testing message sending with disappearing timer active...');
    // Set to 5m
    await axios.patch(
      `${API_BASE}/conversations/${convId}/disappearing`,
      { disappearingTimer: '5m' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    // Send message via HTTP endpoint
    const msg1Res = await axios.post(
      `${API_BASE}/conversations/${convId}/messages`,
      { content: 'This message will disappear in 5 minutes!' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const msg1 = msg1Res.data.message;
    console.log('✓ Message 1 sent:', msg1.content);
    console.log('  Created at:', msg1.createdAt);
    console.log('  Expires at:', msg1.expiresAt);

    if (!msg1.expiresAt) {
      throw new Error('Message 1 missing expiresAt timestamp');
    }
    const diffSec = (new Date(msg1.expiresAt) - new Date(msg1.createdAt)) / 1000;
    if (diffSec < 290 || diffSec > 310) {
      throw new Error(`Expected expiration delta around 300s, got ${diffSec}s`);
    }
    console.log(`✓ Expiration timestamp is correctly set ~300 seconds into the future (${diffSec}s)`);

    // Turn timer OFF and send message 2
    await axios.patch(
      `${API_BASE}/conversations/${convId}/disappearing`,
      { disappearingTimer: 'OFF' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const msg2Res = await axios.post(
      `${API_BASE}/conversations/${convId}/messages`,
      { content: 'This is a persistent message (timer OFF).' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const msg2 = msg2Res.data.message;
    if (msg2.expiresAt !== null) {
      throw new Error('Message 2 expected expiresAt to be null when timer is OFF');
    }
    console.log('✓ Message 2 sent without expiration (expiresAt: null)');

    // 5. Verify User B can see both messages
    console.log('\nStep 5: Verifying User B receives both messages...');
    const userBMsgsBefore = await axios.get(
      `${API_BASE}/conversations/${convId}/messages`,
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    console.log(`✓ User B has ${userBMsgsBefore.data.messages.length} messages`);
    if (userBMsgsBefore.data.messages.length < 2) {
      throw new Error('User B did not receive both messages');
    }

    // 6. Test Clear Chat for User A
    console.log('\nStep 6: User A clears chat history...');
    const clearRes = await axios.post(
      `${API_BASE}/conversations/${convId}/clear`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    console.log('✓ Clear chat response:', clearRes.data);
    if (!clearRes.data.clearedAt) {
      throw new Error('clearedAt timestamp missing from clear response');
    }

    // Verify User A now sees 0 messages
    const userAMsgsAfter = await axios.get(
      `${API_BASE}/conversations/${convId}/messages`,
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    console.log(`✓ User A message count after clear: ${userAMsgsAfter.data.messages.length}`);
    if (userAMsgsAfter.data.messages.length !== 0) {
      throw new Error('User A still sees messages after clearing chat!');
    }

    // Verify User B STILL SEES both messages (preservation of other user's history!)
    console.log('\nStep 7: Verifying User B chat history is preserved...');
    const userBMsgsAfter = await axios.get(
      `${API_BASE}/conversations/${convId}/messages`,
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    console.log(`✓ User B message count after User A cleared: ${userBMsgsAfter.data.messages.length}`);
    if (userBMsgsAfter.data.messages.length < 2) {
      throw new Error("User B's messages were incorrectly deleted when User A cleared!");
    }
    console.log("✓ User B's history is 100% intact and preserved!");

    // 8. Test Automatic Expiration & Background Cleanup
    console.log('\nStep 8: Testing message expiration filtering and cleanup worker...');
    // Insert a test message directly with expiresAt in the past
    const expiredMsg = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: userB.id,
        content: 'This message has already expired.',
        expiresAt: new Date(Date.now() - 5000), // 5 seconds ago
      },
    });
    console.log(`✓ Inserted test expired message (ID: ${expiredMsg.id}, expired 5s ago)`);

    // Query messages through API for User B - expired message MUST NOT be returned!
    const userBMsgsCheck = await axios.get(
      `${API_BASE}/conversations/${convId}/messages`,
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    const foundExpired = userBMsgsCheck.data.messages.some((m) => m.id === expiredMsg.id);
    if (foundExpired) {
      throw new Error('Expired message was returned in getMessages API!');
    }
    console.log('✓ Expired message was successfully filtered out from getMessages API query');

    // Run cleanup worker service
    const deletedCount = await cleanupExpiredMessages();
    console.log(`✓ cleanupExpiredMessages deleted ${deletedCount} message(s) from database`);
    const dbCheck = await prisma.message.findUnique({ where: { id: expiredMsg.id } });
    if (dbCheck !== null) {
      throw new Error('Expired message still exists in database after cleanup!');
    }
    console.log('✓ Expired message was permanently purged from database');

    // 9. Test Security & Authorization
    console.log('\nStep 9: Testing conversation authorization & security...');
    // Register User C (Morgan) who is NOT a member of convId
    const userCRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Morgan Chase',
      username: `morgan_${uid}`,
      email: `morgan_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const tokenC = userCRes.data.token;

    // User C tries to clear Jordan & Taylor's chat
    try {
      await axios.post(
        `${API_BASE}/conversations/${convId}/clear`,
        {},
        { headers: { Authorization: `Bearer ${tokenC}` } }
      );
      throw new Error('Unauthorized user was able to clear chat!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✓ Unauthorized clear chat attempt correctly returned HTTP 403 Forbidden');
      } else {
        throw err;
      }
    }

    // User C tries to set disappearing timer on Jordan & Taylor's chat
    try {
      await axios.patch(
        `${API_BASE}/conversations/${convId}/disappearing`,
        { disappearingTimer: '1h' },
        { headers: { Authorization: `Bearer ${tokenC}` } }
      );
      throw new Error('Unauthorized user was able to change disappearing timer!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✓ Unauthorized timer change attempt correctly returned HTTP 403 Forbidden');
      } else {
        throw err;
      }
    }

    // User C tries to fetch messages from Jordan & Taylor's chat
    try {
      await axios.get(
        `${API_BASE}/conversations/${convId}/messages`,
        { headers: { Authorization: `Bearer ${tokenC}` } }
      );
      throw new Error('Unauthorized user was able to fetch conversation messages!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✓ Unauthorized getMessages attempt correctly returned HTTP 403 Forbidden');
      } else {
        throw err;
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL CLEAR CHAT & DISAPPEARING MESSAGES TESTS PASSED!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

run();
