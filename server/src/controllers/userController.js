import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { validatePassword, isValidUsername } from '../utils/validators.js';
import { generateToken, setAuthCookie } from '../utils/jwt.js';
import { isUserOnline } from '../socket/index.js';

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const searchQuery = q.trim();

    // Find users matching username or fullName, excluding current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: searchQuery } },
              { fullName: { contains: searchQuery } },
            ],
          },
        ],
      },
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
      take: 20,
    });

    // Enrich users with relationship status relative to current user
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        // Check for friend request in either direction
        const request = await prisma.friendRequest.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: user.id },
              { senderId: user.id, receiverId: currentUserId },
            ],
          },
        });

        // Check if blocked
        const blocked = await prisma.blockedUser.findFirst({
          where: {
            OR: [
              { blockerId: currentUserId, blockedId: user.id },
              { blockerId: user.id, blockedId: currentUserId },
            ],
          },
        });

        let relationship = 'NONE';
        let requestId = null;

        if (request) {
          if (request.status === 'ACCEPTED') {
            relationship = 'FRIENDS';
          } else if (request.status === 'PENDING') {
            if (request.senderId === currentUserId) {
              relationship = 'OUTGOING_REQUEST';
            } else {
              relationship = 'INCOMING_REQUEST';
            }
            requestId = request.id;
          }
        }

        return {
          ...user,
          isOnline: isUserOnline(user.id),
          relationship,
          requestId,
          isBlocked: !!blocked,
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: enrichedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        statusMessage: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { fullName, username, bio, avatarUrl, statusMessage } = req.body;

    const dataToUpdate = {};

    // 1. Update Full Name
    if (fullName !== undefined) {
      const cleanName = fullName.trim();
      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: 'Full name cannot be empty.',
        });
      }
      dataToUpdate.fullName = cleanName;
    }

    // 2. Update Username (can be changed multiple times)
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      
      if (!cleanUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username cannot be empty.',
        });
      }

      if (!isValidUsername(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-20 characters: letters, numbers, _, -',
        });
      }

      // Check if username changed and is taken by another user
      if (cleanUsername !== req.user.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: cleanUsername,
            id: { not: currentUserId },
          },
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: `@${cleanUsername} is already taken. Please choose a different username.`,
          });
        }

        dataToUpdate.username = cleanUsername;
      }
    }

    if (bio !== undefined) dataToUpdate.bio = bio.trim();
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl.trim();
    if (statusMessage !== undefined) dataToUpdate.statusMessage = statusMessage.trim();

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        statusMessage: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    // Refresh token with new username if it changed
    if (dataToUpdate.username) {
      const token = generateToken({ userId: updatedUser.id, username: updatedUser.username });
      setAuthCookie(res, token);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.',
      });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'The current password you entered is incorrect.',
      });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: currentUserId },
      data: { passwordHash: newHash },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    await prisma.user.delete({
      where: { id: currentUserId },
    });

    return res.status(200).json({
      success: true,
      message: 'Your account has been permanently removed.',
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target user.',
      });
    }

    await prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: currentUserId,
          blockedId: targetUserId,
        },
      },
      update: {},
      create: {
        blockerId: currentUserId,
        blockedId: targetUserId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User blocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.params;

    await prisma.blockedUser.deleteMany({
      where: {
        blockerId: currentUserId,
        blockedId: targetUserId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User unblocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const blockedList = await prisma.blockedUser.findMany({
      where: { blockerId: currentUserId },
      include: {
        blocked: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      blockedUsers: blockedList.map((b) => b.blocked),
    });
  } catch (error) {
    next(error);
  }
};
