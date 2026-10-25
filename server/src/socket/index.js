import { Server } from 'socket.io';
import { socketAuthMiddleware } from './socketAuth.js';
import prisma from '../config/db.js';
import { calculateExpiration } from '../utils/timer.js';

let io = null;

// Track active connections: userId -> Set of socketIds
const activeUsers = new Map();

export const initSocket = (httpServer, clientOrigin) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // Attach auth middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user.id;

    // Track active socket
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    const userSockets = activeUsers.get(userId);
    const wasOffline = userSockets.size === 0;
    userSockets.add(socket.id);

    // Join personal room for private notifications
    socket.join(`user:${userId}`);

    // Send snapshot of all currently online users immediately to this client
    socket.emit('presence:init', {
      onlineUserIds: Array.from(activeUsers.keys()),
    });

    // If newly online, broadcast to all clients immediately
    if (wasOffline) {
      io.emit('presence:update', {
        userId,
        isOnline: true,
        lastSeenAt: new Date(),
      });
    }

    // Asynchronously update presence in DB and deliver pending messages without blocking event listener registration
    (async () => {
      try {
        if (wasOffline) {
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: true, lastSeenAt: new Date() },
          }).catch(console.error);
        }

        // Catch-up: When recipient connects, mark any pending SENT messages for them as DELIVERED
        const pendingMessages = await prisma.message.findMany({
          where: {
            status: 'SENT',
            conversation: {
              members: {
                some: { userId },
              },
            },
            senderId: { not: userId },
          },
          select: {
            id: true,
            conversationId: true,
            senderId: true,
          },
        });

        if (pendingMessages.length > 0) {
          const now = new Date();
          const pendingIds = pendingMessages.map((m) => m.id);
          await prisma.message.updateMany({
            where: { id: { in: pendingIds } },
            data: {
              status: 'DELIVERED',
              deliveredAt: now,
            },
          });

          // Notify senders in real time
          const byConversation = {};
          for (const msg of pendingMessages) {
            if (!byConversation[msg.conversationId]) {
              byConversation[msg.conversationId] = {
                senderIds: new Set(),
                messageIds: [],
              };
            }
            byConversation[msg.conversationId].senderIds.add(msg.senderId);
            byConversation[msg.conversationId].messageIds.push(msg.id);
          }

          for (const [convId, data] of Object.entries(byConversation)) {
            io.to(`conv:${convId}`).emit('messages:status_update', {
              conversationId: convId,
              messageIds: data.messageIds,
              status: 'DELIVERED',
              deliveredAt: now,
            });

            for (const sId of data.senderIds) {
              io.to(`user:${sId}`).emit('messages:status_update', {
                conversationId: convId,
                messageIds: data.messageIds,
                status: 'DELIVERED',
                deliveredAt: now,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error in post-connection setup:', err);
      }
    })();

    // 1. Join conversation room with authorization check & mark as read
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        // Verify user is a member
        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });

        if (!membership) {
          socket.emit('message:error', {
            conversationId,
            message: 'Unauthorized: You are not a member of this conversation.',
          });
          return;
        }

        socket.join(`conv:${conversationId}`);

        const now = new Date();
        // Update read status for this conversation
        await prisma.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
          data: { lastReadAt: now },
        }).catch(console.error);

        // Mark unread messages as READ
        const unreadMessages = await prisma.message.findMany({
          where: {
            conversationId,
            senderId: { not: userId },
            status: { not: 'READ' },
            ...(membership.clearedAt ? { createdAt: { gt: membership.clearedAt } } : {}),
          },
          select: {
            id: true,
            senderId: true,
          },
        });

        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map((m) => m.id);
          await prisma.message.updateMany({
            where: { id: { in: unreadIds } },
            data: {
              status: 'READ',
              readAt: now,
              deliveredAt: now,
            },
          });

          io.to(`conv:${conversationId}`).emit('messages:read', {
            conversationId,
            messageIds: unreadIds,
            readerId: userId,
            readAt: now,
            status: 'READ',
          });

          const senders = [...new Set(unreadMessages.map((m) => m.senderId))];
          for (const sId of senders) {
            io.to(`user:${sId}`).emit('messages:read', {
              conversationId,
              messageIds: unreadIds.filter((id) =>
                unreadMessages.find((m) => m.id === id && m.senderId === sId)
              ),
              readerId: userId,
              readAt: now,
              status: 'READ',
            });
          }
        }
      } catch (err) {
        console.error('Error joining conversation room:', err);
      }
    });

    // Leave conversation room
    socket.on('conversation:leave', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    // Client marks messages as read
    socket.on('messages:read', async ({ conversationId, messageIds }) => {
      try {
        if (!conversationId || !messageIds || !messageIds.length) return;

        // Verify membership
        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });

        if (!membership) return;

        const now = new Date();
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
            conversationId,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
          data: {
            status: 'READ',
            readAt: now,
            deliveredAt: now,
          },
        });

        await prisma.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
          data: { lastReadAt: now },
        }).catch(console.error);

        io.to(`conv:${conversationId}`).emit('messages:read', {
          conversationId,
          messageIds,
          readerId: userId,
          readAt: now,
          status: 'READ',
        });

        // Also emit to conversation members' private rooms
        const otherMembers = await prisma.conversationMember.findMany({
          where: { conversationId, userId: { not: userId } },
          select: { userId: true },
        });

        for (const m of otherMembers) {
          io.to(`user:${m.userId}`).emit('messages:read', {
            conversationId,
            messageIds,
            readerId: userId,
            readAt: now,
            status: 'READ',
          });
        }
      } catch (err) {
        console.error('Error marking messages as read in socket:', err);
      }
    });

    // 2. Real-time message send
    socket.on('message:send', async ({ conversationId, content, tempId }, callback) => {
      try {
        if (!conversationId || !content || !content.trim()) {
          const errorMsg = 'Message content and conversation ID are required.';
          if (callback) callback({ success: false, error: errorMsg });
          socket.emit('message:error', { conversationId, message: errorMsg });
          return;
        }

        // Verify authorization
        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });

        if (!membership) {
          const errorMsg = 'Unauthorized: You are not authorized to message this conversation.';
          if (callback) callback({ success: false, error: errorMsg });
          socket.emit('message:error', { conversationId, message: errorMsg });
          return;
        }

        // Fetch conversation disappearingTimer to compute expiration
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { disappearingTimer: true },
        });

        const expiresAt = calculateExpiration(conversation?.disappearingTimer);

        // Check delivery and read status
        const otherMembers = await prisma.conversationMember.findMany({
          where: {
            conversationId,
            userId: { not: userId },
          },
          select: { userId: true },
        });

        // Determine if any recipient is actively inside this conversation room
        const roomSockets = io.sockets.adapter.rooms.get(`conv:${conversationId}`);
        let isRecipientInRoom = false;
        if (roomSockets) {
          for (const sockId of roomSockets) {
            const s = io.sockets.sockets.get(sockId);
            if (s && s.user && s.user.id !== userId) {
              isRecipientInRoom = true;
              break;
            }
          }
        }

        const hasOnlineRecipient = otherMembers.some((m) => isUserOnline(m.userId));

        let initialStatus = 'SENT';
        let deliveredAt = null;
        let readAt = null;
        const now = new Date();

        if (isRecipientInRoom) {
          initialStatus = 'READ';
          deliveredAt = now;
          readAt = now;
        } else if (hasOnlineRecipient) {
          initialStatus = 'DELIVERED';
          deliveredAt = now;
        }

        // Persist message in database
        const savedMessage = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId, // Always use authenticated user ID!
            content: content.trim(),
            status: initialStatus,
            deliveredAt,
            readAt,
            expiresAt,
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }).catch(console.error);

        // Emit message to everyone in the conversation room
        io.to(`conv:${conversationId}`).emit('message:new', {
          ...savedMessage,
          tempId,
        });

        if (callback) {
          callback({ success: true, message: savedMessage });
        }

        // Send push notification to offline/inactive conversation members who are NOT in the room
        if (!isRecipientInRoom) {
          for (const member of otherMembers) {
            io.to(`user:${member.userId}`).emit('notification:new', {
              id: `msg-${savedMessage.id}`,
              userId: member.userId,
              type: 'NEW_MESSAGE',
              relatedEntityId: conversationId,
              message: `${user.fullName}: ${content.slice(0, 60)}${content.length > 60 ? '...' : ''}`,
              createdAt: savedMessage.createdAt,
            });
          }
        }
      } catch (err) {
        console.error('Socket message:send error:', err);
        if (callback) callback({ success: false, error: 'Failed to send message.' });
        socket.emit('message:error', { conversationId, message: 'Failed to persist message.' });
      }
    });

    // 3. Typing indicators (authorized to room members only)
    socket.on('typing:start', ({ conversationId }) => {
      if (!conversationId || !socket.rooms.has(`conv:${conversationId}`)) return;
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        username: user.username,
        fullName: user.fullName,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId || !socket.rooms.has(`conv:${conversationId}`)) return;
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        username: user.username,
        fullName: user.fullName,
        isTyping: false,
      });
    });

    // 4. Presence query for refreshing online users on focus or reconnect
    socket.on('presence:query', () => {
      socket.emit('presence:init', {
        onlineUserIds: Array.from(activeUsers.keys()),
      });
    });

    // 5. Disconnect handling
    socket.on('disconnect', () => {
      const sockets = activeUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          activeUsers.delete(userId);

          const now = new Date();
          // Broadcast offline presence immediately to all connected clients
          io.emit('presence:update', {
            userId,
            isOnline: false,
            lastSeenAt: now,
          });

          // Update user status in database in background
          prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeenAt: now },
          }).catch(console.error);
        }
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const isUserOnline = (userId) => {
  const sockets = activeUsers.get(userId);
  return !!sockets && sockets.size > 0;
};
