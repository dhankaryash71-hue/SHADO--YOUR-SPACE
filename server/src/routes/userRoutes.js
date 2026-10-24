import express from 'express';
import {
  searchUsers,
  getUserById,
  updateProfile,
  changePassword,
  deleteAccount,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/search', searchUsers);
router.patch('/me', updateProfile);
router.post('/change-password', changePassword);
router.delete('/me', deleteAccount);
router.post('/block', blockUser);
router.delete('/block/:targetUserId', unblockUser);
router.get('/blocked', getBlockedUsers);
router.get('/:id', getUserById);

export default router;
