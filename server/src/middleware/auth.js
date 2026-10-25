import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    let decoded = null;

    // 1. Check Authorization Header (Bearer token) - primary for SPA
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const bearerCandidate = req.headers.authorization.split(' ')[1];
      const verified = verifyToken(bearerCandidate);
      if (verified && verified.userId) {
        token = bearerCandidate;
        decoded = verified;
      }
    }

    // 2. Fallback to HTTP-only cookie if header not provided or verification failed
    if (!decoded && req.cookies && req.cookies.shado_token) {
      const cookieCandidate = req.cookies.shado_token;
      const verified = verifyToken(cookieCandidate);
      if (verified && verified.userId) {
        token = cookieCandidate;
        decoded = verified;
      }
    }

    if (!token || !decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Invalid or expired session.',
      });
    }

    // Fetch user without exposing passwordHash
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server authentication error.',
    });
  }
};
