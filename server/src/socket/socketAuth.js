import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    // Check handshake cookies if token not in auth payload
    if (!token && socket.handshake.headers?.cookie) {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [key, ...v] = c.trim().split('=');
          return [key, decodeURIComponent(v.join('='))];
        })
      );
      token = cookies.shado_token;
    }

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        statusMessage: true,
      },
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach authenticated user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
};
