import prisma from '../config/db.js';
import { getOrCreateDirectConversationHelper } from './friendController.js';
import { getIO, isUserOnline } from '../socket/index.js';
import { normalizeTimerOption, calculateExpiration, TIMER_LABELS } from '../utils/timer.js';
import { cleanupExpiredMessages } from '../services/expirationService.js';

export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const now = new Date();

    // Trigger cleanup of any expired messages before returning list
    await cleanupExpiredMessages();

    // Get all conversations where current user is a member
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: currentUserId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    username: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format conversations with unread counts, recipient info, and correct last message
    const conversations = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation;

        // Fetch last message respecting user's clearedAt and message expiration
        const lastMessage = await prisma.message.findFirst({
          where: {
            conversationId: conv.id,
            ...(m.clearedAt ? { createdAt: { gt: m.clearedAt } } : {}),
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, fullName: true, username: true },
            },
          },
        });

        // Unread messages count for this user in this conversation (excluding cleared and expired)
        const effectiveReadThreshold =
          m.clearedAt && m.clearedAt > m.lastReadAt ? m.clearedAt : m.lastReadAt;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: currentUserId },
            createdAt: { gt: effectiveReadThreshold },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        });

        // Determine recipient (the other member)
        const recipientMember = conv.members.find((member) => member.userId !== currentUserId);
        const recipient = recipientMember ? recipientMember.user : null;

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name || (recipient ? recipient.fullName : 'Direct Chat'),
          recipient,
          lastMessage,
          unreadCount,
          disappearingTimer: conv.disappearingTimer || 'OFF',
          clearedAt: m.clearedAt,
          lastReadAt: m.lastReadAt,
          updatedAt: lastMessage ? lastMessage.createdAt : conv.updatedAt,
        };
      })
    );

    // Sort by latest message/update
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required.',
      });
    }

    if (recipientId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself.',
      });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found.',
      });
    }

    const conversation = await getOrCreateDirectConversationHelper(currentUserId, recipientId);

    // Also get current user's membership to check clearedAt
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: currentUserId,
        },
      },
    });

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation.id,
        type: conversation.type,
        disappearingTimer: conversation.disappearingTimer || 'OFF',
        clearedAt: membership?.clearedAt || null,
        recipient,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id: conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify current user is an authorized member of this conversation
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      include: {
        conversation: {
          select: {
            disappearingTimer: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not a member of this conversation.',
      });
    }

    // Trigger cleanup of any expired messages
    await cleanupExpiredMessages();

    const now = new Date();
    const whereClause = {
      conversationId,
      // Filter out messages that were cleared by this user
      ...(membership.clearedAt ? { createdAt: { gt: membership.clearedAt } } : {}),
      // Filter out any messages that have expired
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (before) {
      whereClause.createdAt = {
        ...(whereClause.createdAt || {}),
        lt: new Date(before),
      };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' },
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

    // Mark unread messages as READ
    const unreadMessages = messages.filter(
      (m) => m.senderId !== currentUserId && m.status !== 'READ'
    );

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

      // Update in-memory objects so response returns them as READ
      for (const m of messages) {
        if (unreadIds.includes(m.id)) {
          m.status = 'READ';
          m.readAt = now;
          if (!m.deliveredAt) m.deliveredAt = now;
        }
      }

      // Notify senders in real-time via Socket.IO
      const io = getIO();
      if (io) {
        io.to(`conv:${conversationId}`).emit('messages:read', {
          conversationId,
          messageIds: unreadIds,
          readerId: currentUserId,
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
            readerId: currentUserId,
            readAt: now,
            status: 'READ',
          });
        }
      }
    }

    // Update lastReadAt for the user
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      data: {
        lastReadAt: now,
      },
    });

    // Return in chronological order
    messages.reverse();

    return res.status(200).json({
      success: true,
      messages,
      disappearingTimer: membership.conversation?.disappearingTimer || 'OFF',
      clearedAt: membership.clearedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessageHttp = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id: conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.',
      });
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to send messages to this conversation.',
      });
    }

    // Fetch conversation to inspect disappearingTimer
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { disappearingTimer: true },
    });

    const expiresAt = calculateExpiration(conversation?.disappearingTimer);

    // Check delivery and read status
    const otherMembers = await prisma.conversationMember.findMany({
      where: {
        conversationId,
        userId: { not: currentUserId },
      },
      select: { userId: true },
    });

    const io = getIO();
    let initialStatus = 'SENT';
    let deliveredAt = null;
    let readAt = null;
    const now = new Date();

    if (io) {
      const roomSockets = io.sockets.adapter.rooms.get(`conv:${conversationId}`);
      let isRecipientInRoom = false;
      if (roomSockets) {
        for (const sockId of roomSockets) {
          const s = io.sockets.sockets.get(sockId);
          if (s && s.user && s.user.id !== currentUserId) {
            isRecipientInRoom = true;
            break;
          }
        }
      }

      if (isRecipientInRoom) {
        initialStatus = 'READ';
        deliveredAt = now;
        readAt = now;
      } else {
        const hasOnlineRecipient = otherMembers.some((m) => isUserOnline(m.userId));
        if (hasOnlineRecipient) {
          initialStatus = 'DELIVERED';
          deliveredAt = now;
        }
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
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

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Emit to socket room
    if (io) {
      io.to(`conv:${conversationId}`).emit('message:new', message);
    }

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

// Explicit endpoint to mark conversation as read
export const markConversationAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id: conversationId } = req.params;

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not a member of this conversation.',
      });
    }

    const now = new Date();
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      data: {
        lastReadAt: now,
      },
    });

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: currentUserId },
        status: { not: 'READ' },
      },
      select: { id: true, senderId: true },
    });

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((m) => m.id);
      await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: {
          status: 'READ',
          readAt: now,
          deliveredAt: now,
        },
      });

      const io = getIO();
      if (io) {
        io.to(`conv:${conversationId}`).emit('messages:read', {
          conversationId,
          messageIds,
          readerId: currentUserId,
          readAt: now,
          status: 'READ',
        });

        const senders = [...new Set(unreadMessages.map((m) => m.senderId))];
        for (const sId of senders) {
          io.to(`user:${sId}`).emit('messages:read', {
            conversationId,
            messageIds: messageIds.filter((id) =>
              unreadMessages.find((m) => m.id === id && m.senderId === sId)
            ),
            readerId: currentUserId,
            readAt: now,
            status: 'READ',
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      markedCount: unreadMessages.length,
      readAt: now,
    });
  } catch (error) {
    next(error);
  }
};

// Clear chat history for the requesting user ONLY
export const clearChat = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id: conversationId } = req.params;

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not a member of this conversation.',
      });
    }

    const now = new Date();

    // Update clearedAt on the member record (preserving the other user's chat history)
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { clearedAt: now },
    });

    // Notify requesting user's active sockets to clear local chat state immediately
    const io = getIO();
    if (io) {
      io.to(`user:${currentUserId}`).emit('chat:cleared', {
        conversationId,
        clearedAt: now,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat cleared successfully for your account.',
      clearedAt: now,
    });
  } catch (error) {
    next(error);
  }
};

// Update Disappearing Messages timer setting for the conversation
export const setDisappearingTimer = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id: conversationId } = req.params;
    const timer = req.body.timer || req.body.disappearingTimer;

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not a member of this conversation.',
      });
    }

    const normalized = normalizeTimerOption(timer);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timer option. Must be: OFF, 5m, 1h, 24h, 7d, or 90d.',
      });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { disappearingTimer: normalized },
    });

    const label = TIMER_LABELS[normalized] || normalized;

    // Emit real-time timer update to all connected conversation members
    const io = getIO();
    if (io) {
      io.to(`conv:${conversationId}`).emit('conversation:timer_update', {
        conversationId,
        disappearingTimer: normalized,
        updatedBy: {
          id: currentUserId,
          fullName: req.user.fullName,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Disappearing messages set to ${label}.`,
      disappearingTimer: normalized,
    });
  } catch (error) {
    next(error);
  }
};
