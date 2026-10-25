import axios from 'axios';
import { io } from 'socket.io-client';
import prisma from '../config/db.js';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runTest = async () => {
  console.log('===============================================================');
  console.log('🧪 Testing WhatsApp-Style Message Status Indicators (Ticks)');
  console.log('   ✓   One Grey Tick: Sent to server');
  console.log('   ✓✓  Two Grey Ticks: Delivered to recipient device');
  console.log('   ✓✓  Two Blue Ticks: Read by recipient upon opening chat');
  console.log('===============================================================\n');

  let socketA = null;
  let socketB = null;

  try {
    const uid = Math.floor(Math.random() * 89999 + 10000);

    // 1. Register User A (Devon) & User B (Casey)
    console.log('Step 1: Registering User A (Devon) and User B (Casey)...');
    const userARes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Devon Vance',
      username: `devon_${uid}`,
      email: `devon_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const userA = userARes.data.user;
    const tokenA = userARes.data.token;
    console.log(`✓ User A registered: ${userA.fullName} (@${userA.username})`);

    const userBRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Casey Morgan',
      username: `casey_${uid}`,
      email: `casey_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const userB = userBRes.data.user;
    const tokenB = userBRes.data.token;
    console.log(`✓ User B registered: ${userB.fullName} (@${userB.username})`);

    // 2. User A creates conversation with User B
    console.log('\nStep 2: User A creates conversation with User B...');
    const convRes = await axios.post(
      `${API_BASE}/conversations`,
      { recipientId: userB.id },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const convId = convRes.data.conversation.id;
    console.log(`✓ Conversation established: ID ${convId}`);

    // Connect User A socket (Device A is active, Device B is OFFLINE)
    console.log('\nStep 3: Device A connects to Socket.IO. Device B remains OFFLINE...');
    socketA = io(SOCKET_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      socketA.on('connect', resolve);
      socketA.on('connect_error', reject);
    });
    console.log('✓ Device A connected to socket.');

    socketA.emit('conversation:join', { conversationId: convId });
    await sleep(200);

    // Track status updates received on Device A
    const statusEventsOnA = [];
    socketA.on('messages:status_update', (data) => {
      statusEventsOnA.push(data);
    });
    socketA.on('messages:read', (data) => {
      statusEventsOnA.push(data);
    });

    // 4. Test Scenario: One Grey Tick (SENT)
    console.log('\nStep 4: User A sends Message 1 while User B is OFFLINE...');
    const sendAck = await new Promise((resolve) => {
      socketA.emit(
        'message:send',
        { conversationId: convId, content: 'Hey Casey, are you around?' },
        resolve
      );
    });

    if (!sendAck.success) {
      throw new Error(`Failed to send Message 1: ${sendAck.error}`);
    }
    const msg1 = sendAck.message;
    console.log(`✓ Message 1 sent! ID: ${msg1.id}, Status: ${msg1.status}`);
    if (msg1.status !== 'SENT') {
      throw new Error(`Expected Message 1 status to be "SENT", but got "${msg1.status}"`);
    }
    console.log('✓ Message 1 correctly has status "SENT" (✓ One grey tick)');

    // Verify in database directly
    const dbMsg1 = await prisma.message.findUnique({ where: { id: msg1.id } });
    if (dbMsg1.status !== 'SENT' || dbMsg1.deliveredAt !== null || dbMsg1.readAt !== null) {
      throw new Error('Database Message 1 does not reflect SENT state');
    }
    console.log('✓ Database verification: status="SENT", deliveredAt=null, readAt=null');

    // 5. Test Scenario: Two Grey Ticks (DELIVERED) upon Recipient Connection
    console.log('\nStep 5: Device B connects to Socket.IO (Recipient comes online)...');
    socketB = io(SOCKET_URL, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      socketB.on('connect', resolve);
      socketB.on('connect_error', reject);
    });
    console.log('✓ Device B connected to socket.');

    // Wait for server catch-up to process pending messages (accommodating remote Neon DB round trips)
    let dbMsg1Delivered = null;
    for (let i = 0; i < 20; i++) {
      await sleep(200);
      dbMsg1Delivered = await prisma.message.findUnique({ where: { id: msg1.id } });
      if (dbMsg1Delivered && dbMsg1Delivered.status === 'DELIVERED') {
        break;
      }
    }

    console.log(`✓ Database Message 1 status after Device B online: ${dbMsg1Delivered?.status}`);
    if (!dbMsg1Delivered || dbMsg1Delivered.status !== 'DELIVERED' || !dbMsg1Delivered.deliveredAt) {
      throw new Error('Message 1 was not updated to DELIVERED upon recipient connection');
    }
    console.log('  deliveredAt timestamp:', dbMsg1Delivered.deliveredAt);

    // Verify User A received status update event via Socket.IO
    const deliveredEvent = statusEventsOnA.find(
      (e) => e.status === 'DELIVERED' && e.messageIds && e.messageIds.includes(msg1.id)
    );
    if (!deliveredEvent) {
      throw new Error('Device A did not receive real-time messages:status_update event');
    }
    console.log('✓ Device A received real-time DELIVERED event over Socket.IO (✓✓ Two grey ticks)');

    // 6. Test Scenario: Immediate DELIVERED for new messages while recipient is online
    console.log('\nStep 6: User A sends Message 2 while User B is ONLINE (but not viewing chat)...');
    const sendAck2 = await new Promise((resolve) => {
      socketA.emit(
        'message:send',
        { conversationId: convId, content: 'Glad you are online!' },
        resolve
      );
    });
    const msg2 = sendAck2.message;
    console.log(`✓ Message 2 sent! ID: ${msg2.id}, Status: ${msg2.status}`);
    if (msg2.status !== 'DELIVERED') {
      throw new Error(`Expected Message 2 to be "DELIVERED" immediately, got "${msg2.status}"`);
    }
    console.log('✓ Message 2 immediately saved as "DELIVERED" (✓✓ Two grey ticks)');

    // 7. Test Scenario: Two Blue Ticks (READ) upon Recipient Opening Conversation
    console.log('\nStep 7: User B opens the conversation (fetching messages & joining room)...');
    // Device B fetches messages via HTTP
    const getMsgsRes = await axios.get(`${API_BASE}/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    console.log(`✓ User B fetched ${getMsgsRes.data.messages.length} messages`);

    // Device B joins socket room
    socketB.emit('conversation:join', { conversationId: convId });

    // Poll until both messages are updated to READ in database
    let checkDbMsg1 = null;
    let checkDbMsg2 = null;
    for (let i = 0; i < 20; i++) {
      await sleep(200);
      checkDbMsg1 = await prisma.message.findUnique({ where: { id: msg1.id } });
      checkDbMsg2 = await prisma.message.findUnique({ where: { id: msg2.id } });
      if (checkDbMsg1?.status === 'READ' && checkDbMsg2?.status === 'READ') {
        break;
      }
    }

    console.log(`✓ Database Message 1 status: ${checkDbMsg1?.status}, readAt: ${checkDbMsg1?.readAt}`);
    console.log(`✓ Database Message 2 status: ${checkDbMsg2?.status}, readAt: ${checkDbMsg2?.readAt}`);

    if (checkDbMsg1.status !== 'READ' || !checkDbMsg1.readAt) {
      throw new Error('Message 1 was not updated to READ with read timestamp');
    }
    if (checkDbMsg2.status !== 'READ' || !checkDbMsg2.readAt) {
      throw new Error('Message 2 was not updated to READ with read timestamp');
    }

    // Verify User A received real-time 'messages:read' Socket.IO event without page refresh
    const readEvent = statusEventsOnA.find(
      (e) => e.status === 'READ' && e.messageIds && e.messageIds.includes(msg1.id)
    );
    if (!readEvent) {
      throw new Error('Device A did not receive real-time messages:read event');
    }
    console.log('✓ Device A received real-time messages:read event over Socket.IO!');
    console.log('✓ Sender UI instantly updates to two blue ticks (✓✓ Two blue ticks)');

    // 8. Test Scenario: Active in-room messaging (both users in room)
    console.log('\nStep 8: User A sends Message 3 while User B is actively in the room...');
    const sendAck3 = await new Promise((resolve) => {
      socketA.emit(
        'message:send',
        { conversationId: convId, content: 'We are both here chatting live!' },
        resolve
      );
    });
    const msg3 = sendAck3.message;
    console.log(`✓ Message 3 sent! ID: ${msg3.id}, Status: ${msg3.status}`);
    if (msg3.status !== 'READ') {
      throw new Error(`Expected Message 3 to be "READ" immediately since recipient is in room, got "${msg3.status}"`);
    }
    console.log('✓ Message 3 immediately saved with status="READ" and readAt timestamp!');

    // 9. Test Authorization: Unauthorized user cannot mark messages as read
    console.log('\nStep 9: Testing security & authorization...');
    const userCRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Taylor Unauthorized',
      username: `taylor_${uid}`,
      email: `taylor_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const tokenC = userCRes.data.token;

    try {
      await axios.patch(
        `${API_BASE}/conversations/${convId}/read`,
        {},
        { headers: { Authorization: `Bearer ${tokenC}` } }
      );
      throw new Error('Unauthorized user was able to mark conversation as read!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✓ Unauthorized markAsRead request correctly rejected with HTTP 403 Forbidden');
      } else {
        throw err;
      }
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL WHATSAPP STATUS INDICATOR TESTS PASSED WITH 100% SUCCESS!');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    await prisma.$disconnect();
  }
};

runTest();
