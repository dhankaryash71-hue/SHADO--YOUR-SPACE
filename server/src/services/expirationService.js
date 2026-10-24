import prisma from '../config/db.js';
import { getIO } from '../socket/index.js';

let cleanupInterval = null;

export const cleanupExpiredMessages = async () => {
  try {
    const now = new Date();

    // 1. Locate all messages whose expiration timestamp has passed
    const expiredMessages = await prisma.message.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        conversationId: true,
      },
    });

    if (expiredMessages.length === 0) return 0;

    const expiredIds = expiredMessages.map((m) => m.id);

    // 2. Delete expired messages from the database
    await prisma.message.deleteMany({
      where: {
        id: {
          in: expiredIds,
        },
      },
    });

    // 3. Group deleted IDs by conversation to notify connected clients in real time
    const byConversation = {};
    for (const msg of expiredMessages) {
      if (!byConversation[msg.conversationId]) {
        byConversation[msg.conversationId] = [];
      }
      byConversation[msg.conversationId].push(msg.id);
    }

    const io = getIO();
    if (io) {
      for (const [conversationId, messageIds] of Object.entries(byConversation)) {
        io.to(`conv:${conversationId}`).emit('messages:expired', {
          conversationId,
          messageIds,
        });
      }
    }

    return expiredMessages.length;
  } catch (error) {
    console.error('[SHADO Expiration Service] Cleanup error:', error);
    return 0;
  }
};

export const startExpirationWorker = (intervalMs = 10000) => {
  if (cleanupInterval) return;

  // Run initial cleanup on worker boot
  cleanupExpiredMessages();

  cleanupInterval = setInterval(async () => {
    await cleanupExpiredMessages();
  }, intervalMs);

  console.log(`[SHADO Expiration Service] Worker running (interval: ${intervalMs / 1000}s)`);
};

export const stopExpirationWorker = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};
