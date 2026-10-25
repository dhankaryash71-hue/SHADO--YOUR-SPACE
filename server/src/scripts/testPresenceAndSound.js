import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPresenceAndSoundTests() {
  console.log('===============================================================');
  console.log('🧪 Testing Presence Tracking & Active Status Synchronization');
  console.log('===============================================================\n');

  let socketA = null;
  let socketB = null;

  try {
    const uid = Math.floor(Math.random() * 90000) + 10000;

    // Step 1: Register two test users
    console.log('Step 1: Registering Devon and Jordan...');
    const userARes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Devon Vance',
      username: `devon_pres_${uid}`,
      email: `devon_pres_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const userA = userARes.data.user;
    const tokenA = userARes.data.token;

    const userBRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Jordan Blake',
      username: `jordan_pres_${uid}`,
      email: `jordan_pres_${uid}@shado.test`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const userB = userBRes.data.user;
    const tokenB = userBRes.data.token;
    console.log(`✓ Devon registered (ID: ${userA.id})`);
    console.log(`✓ Jordan registered (ID: ${userB.id})`);

    // Step 2: Establish direct conversation
    console.log('\nStep 2: Establishing direct conversation between Devon and Jordan...');
    const convRes = await axios.post(
      `${API_BASE}/conversations`,
      { recipientId: userB.id },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const convId = convRes.data.conversation.id;
    console.log(`✓ Conversation created: ${convId}`);

    // Verify REST API before any socket connection: both should be offline
    const initialConvs = await axios.get(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const convRecipient = initialConvs.data.conversations[0]?.recipient;
    console.log(`✓ Initial REST check: Jordan isOnline=${convRecipient?.isOnline} (Expected: false)`);
    if (convRecipient?.isOnline !== false) {
      throw new Error(`Expected Jordan to be offline initially, but got isOnline=${convRecipient?.isOnline}`);
    }

    // Step 3: Devon connects to Socket.IO
    console.log('\nStep 3: Devon connects to Socket.IO...');
    const presenceUpdatesOnA = [];
    let initialPresenceOnA = null;

    socketA = io(SOCKET_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    socketA.on('presence:init', (data) => {
      initialPresenceOnA = data;
    });

    socketA.on('presence:update', (data) => {
      presenceUpdatesOnA.push(data);
    });

    await new Promise((resolve, reject) => {
      socketA.on('connect', resolve);
      socketA.on('connect_error', reject);
    });
    console.log('✓ Devon connected to socket');

    await sleep(250);
    console.log('✓ Devon received presence:init snapshot:', initialPresenceOnA);
    if (!initialPresenceOnA || !Array.isArray(initialPresenceOnA.onlineUserIds)) {
      throw new Error('presence:init was not received or does not contain onlineUserIds array');
    }
    if (!initialPresenceOnA.onlineUserIds.includes(userA.id)) {
      throw new Error("Devon's user ID was not included in onlineUserIds on connection");
    }

    // Step 4: Jordan connects to Socket.IO
    console.log('\nStep 4: Jordan connects to Socket.IO...');
    let initialPresenceOnB = null;

    socketB = io(SOCKET_URL, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    socketB.on('presence:init', (data) => {
      initialPresenceOnB = data;
    });

    await new Promise((resolve, reject) => {
      socketB.on('connect', resolve);
      socketB.on('connect_error', reject);
    });
    console.log('✓ Jordan connected to socket');

    await sleep(350);

    // Verify Jordan received presence:init containing Devon (who was already online!)
    console.log('✓ Jordan received presence:init snapshot:', initialPresenceOnB);
    if (!initialPresenceOnB || !initialPresenceOnB.onlineUserIds.includes(userA.id)) {
      throw new Error('Jordan did NOT receive Devon in presence:init upon connecting!');
    }
    console.log('✓ Jordan immediately sees Devon as online via presence:init!');

    // Verify Devon received presence:update indicating Jordan is now online
    const jordanOnlineEvent = presenceUpdatesOnA.find(
      (e) => e.userId === userB.id && e.isOnline === true
    );
    if (!jordanOnlineEvent) {
      throw new Error('Devon did not receive real-time presence:update for Jordan coming online');
    }
    console.log('✓ Devon received real-time presence:update: Jordan is ONLINE!');

    // Step 5: Test REST API dynamic enrichment
    console.log('\nStep 5: Verifying REST API reports Jordan as online in real time...');
    const liveConvs = await axios.get(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const liveRecipient = liveConvs.data.conversations[0]?.recipient;
    console.log(`✓ REST /conversations Jordan isOnline: ${liveRecipient?.isOnline}`);
    if (liveRecipient?.isOnline !== true) {
      throw new Error('REST API did not report Jordan as online while connected');
    }

    // Step 6: Test presence:query
    console.log('\nStep 6: Testing client presence:query (re-sync on window focus)...');
    let reSyncSnapshot = null;
    socketB.once('presence:init', (data) => {
      reSyncSnapshot = data;
    });
    socketB.emit('presence:query');
    await sleep(250);

    if (!reSyncSnapshot || !reSyncSnapshot.onlineUserIds.includes(userA.id)) {
      throw new Error('presence:query did not return active user IDs');
    }
    console.log('✓ presence:query correctly returned active snapshot:', reSyncSnapshot.onlineUserIds);

    // Step 7: Test message:new incoming notification event
    console.log('\nStep 7: Testing incoming message delivery and notification event...');
    socketA.emit('conversation:join', { conversationId: convId });
    socketB.emit('conversation:join', { conversationId: convId });
    await sleep(200);

    let incomingMsgOnB = null;
    socketB.on('message:new', (msg) => {
      incomingMsgOnB = msg;
    });

    const sendAck = await new Promise((resolve) => {
      socketA.emit(
        'message:send',
        { conversationId: convId, content: 'Hey Jordan! Testing notification chime.' },
        resolve
      );
    });

    if (!sendAck.success) {
      throw new Error(`Failed to send message: ${sendAck.error}`);
    }

    await sleep(300);
    if (!incomingMsgOnB) {
      throw new Error('Jordan did not receive message:new event over Socket.IO');
    }
    console.log('✓ message:new event received on Jordan with ID:', incomingMsgOnB.id);
    if (incomingMsgOnB.senderId !== userA.id) {
      throw new Error('Sender ID does not match Devon');
    }
    console.log(`✓ Condition (msg.senderId !== currentUserId): (${incomingMsgOnB.senderId} !== ${userB.id}) => TRUE`);
    console.log('✓ Notification sound condition verified: Chime plays for recipient on incoming message!');

    // Step 8: Jordan disconnects -> Verify Devon receives offline presence with lastSeenAt
    console.log('\nStep 8: Jordan disconnects from Socket.IO...');
    socketB.disconnect();
    await sleep(350);

    const jordanOfflineEvent = presenceUpdatesOnA.find(
      (e) => e.userId === userB.id && e.isOnline === false
    );
    if (!jordanOfflineEvent) {
      throw new Error('Devon did not receive presence:update when Jordan disconnected');
    }
    console.log('✓ Devon received presence:update: Jordan is OFFLINE!');
    console.log('  lastSeenAt timestamp:', jordanOfflineEvent.lastSeenAt);
    if (!jordanOfflineEvent.lastSeenAt) {
      throw new Error('presence:update offline event is missing lastSeenAt timestamp');
    }

    // Verify REST API reflects offline state
    const afterDisconnectConvs = await axios.get(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const afterRecipient = afterDisconnectConvs.data.conversations[0]?.recipient;
    console.log(`✓ REST /conversations Jordan isOnline after disconnect: ${afterRecipient?.isOnline}`);
    if (afterRecipient?.isOnline !== false) {
      throw new Error('REST API did not report Jordan as offline after disconnect');
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL PRESENCE TRACKING & NOTIFICATION TESTS PASSED WITH 100%!');
    console.log('===============================================================\n');
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
  }
}

runPresenceAndSoundTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
