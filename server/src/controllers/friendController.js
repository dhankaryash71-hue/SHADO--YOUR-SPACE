import prisma from '../config/db.js';
import { getIO } from '../socket/index.js';

export const sendRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required.',
      });
    }

    if (receiverId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself.',
      });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Target user does not exist.',
      });
    }

    // Check if blocked
    const isBlocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: currentUserId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot interact with this user.',
      });
    }

    // Check existing request
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: receiverId },
          { senderId: receiverId, receiverId: currentUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({
          success: false,
          message: 'You are already friends with this user.',
        });
      }
      if (existing.status === 'PENDING') {
        if (existing.senderId === currentUserId) {
          return res.status(400).json({
            success: false,
            message: 'You have already sent a friend request to this user.',
          });
        } else {
          // If the other user already sent a request, auto-accept it!
          const accepted = await prisma.friendRequest.update({
            where: { id: existing.id },
            data: { status: 'ACCEPTED' },
            include: {
              sender: {
                select: { id: true, fullName: true, username: true, avatarUrl: true },
              },
            },
          });

          // Ensure direct conversation exists
          await getOrCreateDirectConversationHelper(currentUserId, receiverId);

          // Notify sender
          const notif = await prisma.notification.create({
            data: {
              userId: receiverId,
              type: 'FRIEND_ACCEPT',
              relatedEntityId: currentUserId,
              message: `${req.user.fullName} (@${req.user.username}) accepted your friend request!`,
            },
          });

          const io = getIO();
          if (io) {
            io.to(`user:${receiverId}`).emit('notification:new', notif);
            io.to(`user:${receiverId}`).emit('friend:update', { type: 'ACCEPTED', user: req.user });
          }

          return res.status(200).json({
            success: true,
            message: 'Mutual request matched! You are now friends.',
            request: accepted,
          });
        }
      }
    }

    // Create new friend request
    const request = await prisma.friendRequest.create({
      data: {
        senderId: currentUserId,
        receiverId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: { id: true, fullName: true, username: true, avatarUrl: true },
        },
      },
    });

    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'FRIEND_REQUEST',
        relatedEntityId: currentUserId,
        message: `${req.user.fullName} (@${req.user.username}) sent you a friend request.`,
      },
    });

    // Real-time notification emission via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user:${receiverId}`).emit('notification:new', notification);
      io.to(`user:${receiverId}`).emit('friend:request:incoming', {
        id: request.id,
        sender: {
          id: req.user.id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatarUrl: req.user.avatarUrl,
        },
        createdAt: request.createdAt,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Friend request sent successfully.',
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const getIncomingRequests = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: currentUserId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

export const getOutgoingRequests = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: currentUserId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRequestStatus = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id } = req.params;
    const { status } = req.body; // 'ACCEPTED' or 'DECLINED'

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either ACCEPTED or DECLINED.',
      });
    }

    const request = await prisma.friendRequest.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, fullName: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found.',
      });
    }

    if (request.receiverId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this friend request.',
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${request.status.toLowerCase()}.`,
      });
    }

    const updatedRequest = await prisma.friendRequest.update({
      where: { id },
      data: { status },
    });

    const io = getIO();

    if (status === 'ACCEPTED') {
      // Create or locate direct conversation
      const conversation = await getOrCreateDirectConversationHelper(currentUserId, request.senderId);

      // Create notification for original sender
      const notification = await prisma.notification.create({
        data: {
          userId: request.senderId,
          type: 'FRIEND_ACCEPT',
          relatedEntityId: currentUserId,
          message: `${req.user.fullName} (@${req.user.username}) accepted your friend request!`,
        },
      });

      if (io) {
        io.to(`user:${request.senderId}`).emit('notification:new', notification);
        io.to(`user:${request.senderId}`).emit('friend:update', {
          type: 'ACCEPTED',
          user: req.user,
          conversationId: conversation.id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Friend request ${status.toLowerCase()} successfully.`,
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id } = req.params;

    const request = await prisma.friendRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found.',
      });
    }

    if (request.senderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request.',
      });
    }

    await prisma.friendRequest.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Friend request cancelled successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getFriends = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    // Fetch accepted friend requests where current user is sender or receiver
    const acceptedRequests = await prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: currentUserId },
          { receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            bio: true,
            statusMessage: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            bio: true,
            statusMessage: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
    });

    // Map to the friend object (the other user in the relationship)
    const friends = acceptedRequests.map((req) => {
      const isSender = req.senderId === currentUserId;
      const friendData = isSender ? req.receiver : req.sender;
      return {
        ...friendData,
        friendshipId: req.id,
        connectedAt: req.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      friends,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFriend = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id: friendId } = req.params;

    // Delete any accepted request between these two users
    await prisma.friendRequest.deleteMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: currentUserId, receiverId: friendId },
          { senderId: friendId, receiverId: currentUserId },
        ],
      },
    });

    const io = getIO();
    if (io) {
      io.to(`user:${friendId}`).emit('friend:update', {
        type: 'REMOVED',
        userId: currentUserId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Friend removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create or locate direct conversation between two users
export const getOrCreateDirectConversationHelper = async (user1Id, user2Id) => {
  // Find common conversation of type DIRECT
  const existingConv = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { members: { some: { userId: user1Id } } },
        { members: { some: { userId: user2Id } } },
      ],
    },
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
  });

  if (existingConv) {
    return existingConv;
  }

  // Create new conversation
  const newConversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: user1Id },
          { userId: user2Id },
        ],
      },
    },
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
  });

  return newConversation;
};
