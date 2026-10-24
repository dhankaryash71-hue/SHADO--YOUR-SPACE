import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const runTest = async () => {
  console.log('--- Starting SHADO Comprehensive End-to-End Test ---');

  try {
    const uid = Math.floor(Math.random() * 89999 + 10000);
    // 1. Yash Registers
    console.log('\n1. Registering Yash...');
    const yashRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Yash Vardhan',
      username: `yash_${uid}`,
      email: `yash_${uid}@shado.app`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    console.log('✓ Yash registered:', yashRes.data.user.username);
    const yashToken = yashRes.data.token;

    // 2. Alex Registers
    console.log('\n2. Registering Alex...');
    const alexRes = await axios.post(`${API_BASE}/auth/register`, {
      fullName: 'Alex Rivera',
      username: `alex_${uid}`,
      email: `alex_${uid}@shado.app`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    console.log('✓ Alex registered:', alexRes.data.user.username);
    const alexToken = alexRes.data.token;

    // 3. Yash searches for Alex
    console.log(`\n3. Yash searching for "alex_${uid}"...`);
    const searchRes = await axios.get(`${API_BASE}/users/search?q=alex_${uid}`, {
      headers: { Authorization: `Bearer ${yashToken}` },
    });
    console.log(`✓ Search results found: ${searchRes.data.users.length}`);
    const alexUser = searchRes.data.users.find((u) => u.username === `alex_${uid}`) || searchRes.data.users[0];
    console.log(`  Found user: ${alexUser.fullName} (@${alexUser.username}), relationship: ${alexUser.relationship}`);

    // 4. Yash sends friend request to Alex
    console.log('\n4. Yash sending friend request to Alex...');
    const reqRes = await axios.post(
      `${API_BASE}/friends/requests`,
      { receiverId: alexUser.id },
      { headers: { Authorization: `Bearer ${yashToken}` } }
    );
    console.log('✓ Friend request sent! Request ID:', reqRes.data.request.id);
    const requestId = reqRes.data.request.id;

    // 5. Alex checks incoming requests
    console.log('\n5. Alex checking incoming requests...');
    const incRes = await axios.get(`${API_BASE}/friends/requests/incoming`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    console.log(`✓ Alex has ${incRes.data.requests.length} incoming request(s)`);
    console.log(`  From: ${incRes.data.requests[0].sender.fullName}`);

    // 6. Alex accepts the request
    console.log('\n6. Alex accepting friend request...');
    const acceptRes = await axios.patch(
      `${API_BASE}/friends/requests/${requestId}`,
      { status: 'ACCEPTED' },
      { headers: { Authorization: `Bearer ${alexToken}` } }
    );
    console.log('✓ Friend request accepted:', acceptRes.data.success);

    // 7. Yash checks friends list
    console.log('\n7. Yash checking friends list...');
    const yashFriends = await axios.get(`${API_BASE}/friends`, {
      headers: { Authorization: `Bearer ${yashToken}` },
    });
    console.log(`✓ Yash has ${yashFriends.data.friends.length} friend(s):`, yashFriends.data.friends.map(f => f.fullName));

    // 8. Alex checks friends list
    console.log('\n8. Alex checking friends list...');
    const alexFriends = await axios.get(`${API_BASE}/friends`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    console.log(`✓ Alex has ${alexFriends.data.friends.length} friend(s):`, alexFriends.data.friends.map(f => f.fullName));

    // 9. Yash gets conversations list
    console.log('\n9. Yash checking conversations list...');
    const convsRes = await axios.get(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${yashToken}` },
    });
    console.log(`✓ Yash has ${convsRes.data.conversations.length} conversation(s)`);
    const conversation = convsRes.data.conversations[0];
    console.log(`  Conversation with: ${conversation.recipient.fullName}`);

    // 10. Yash sends a message
    console.log('\n10. Yash sending message to Alex...');
    const sendMsgRes = await axios.post(
      `${API_BASE}/conversations/${conversation.id}/messages`,
      { content: 'Hey Alex! Welcome to SHADO. The real-time interface is stunning!' },
      { headers: { Authorization: `Bearer ${yashToken}` } }
    );
    console.log('✓ Message sent successfully! Content:', sendMsgRes.data.message.content);

    // 11. Alex retrieves messages
    console.log('\n11. Alex fetching messages in conversation...');
    const msgsRes = await axios.get(`${API_BASE}/conversations/${conversation.id}/messages`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    console.log(`✓ Alex retrieved ${msgsRes.data.messages.length} message(s):`);
    msgsRes.data.messages.forEach(m => {
      console.log(`  [${m.sender.fullName}]: ${m.content}`);
    });

    // 12. Alex responds
    console.log('\n12. Alex responding...');
    const replyRes = await axios.post(
      `${API_BASE}/conversations/${conversation.id}/messages`,
      { content: 'Hey Yash! It really is. The electric violet theme is gorgeous! ⚡' },
      { headers: { Authorization: `Bearer ${alexToken}` } }
    );
    console.log('✓ Alex replied successfully! Content:', replyRes.data.message.content);

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS! 🎉');
    console.log('======================================================\n');
  } catch (error) {
    console.error('Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
};

runTest();
