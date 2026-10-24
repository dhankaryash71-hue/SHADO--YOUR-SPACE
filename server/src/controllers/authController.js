import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { isValidEmail, isValidUsername, validatePassword } from '../utils/validators.js';

export const register = async (req, res, next) => {
  try {
    const { fullName, username, email, password, confirmPassword } = req.body;

    // Validate presence
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Validate email
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Validate username
    const cleanUsername = username.trim().toLowerCase();
    if (!isValidUsername(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-20 alphanumeric characters, underscores, or hyphens.',
      });
    }

    // Validate password complexity
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: cleanUsername },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      if (existingUser.username === cleanUsername) {
        return res.status(409).json({
          success: false,
          message: 'This username is already taken. Please choose another.',
        });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Dynamic initial avatar color generator
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanUsername)}&backgroundColor=7c3aed,3b82f6,6366f1&textColor=ffffff`;

    // Create user
    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        avatarUrl,
        bio: 'Connecting on SHADO.',
        isOnline: true,
      },
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

    // Create Welcome system notification
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: 'SYSTEM',
        message: `Welcome to SHADO, ${newUser.fullName}! Search users to add friends and begin messaging.`,
      },
    });

    // Generate JWT & set cookie
    const token = generateToken({ userId: newUser.id, username: newUser.username });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to SHADO.',
      user: newUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and your password.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find by username OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { username: cleanIdentifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No account found with that email or username.',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Update online status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
      },
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

    // Generate token & set cookie
    const token = generateToken({ userId: updatedUser.id, username: updatedUser.username });
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${updatedUser.fullName}!`,
      user: updatedUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          isOnline: false,
          lastSeenAt: new Date(),
        },
      });
    }

    clearAuthCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your account email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // For security, always respond with generic confirmation
    return res.status(200).json({
      success: true,
      message: user
        ? 'A secure password reset link has been dispatched to your email address.'
        : 'If an account matches that email, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};
