import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    let decoded = token ? verifyToken(token) : null;

    // Check handshake cookies if token not in auth payload or failed verification
    if ((!decoded || !decoded.userId) && socket.handshake.headers?.cookie) {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [key, ...v] = c.trim().split('=');
          return [key, decodeURIComponent(v.join('='))];
        })
      );
      if (cookies.shado_token) {
        const cookieToken = cookies.shado_token;
        const cookieDecoded = verifyToken(cookieToken);
        if (cookieDecoded && cookieDecoded.userId) {
          token = cookieToken;
          decoded = cookieDecoded;
        }
      }
    }

    if (!token || !decoded || !decoded.userId) {
      return next(new Error('Authentication error: Missing or invalid token'));
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
