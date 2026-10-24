import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessageHttp,
  clearChat,
  setDisappearingTimer,
  markConversationAsRead,
} from '../controllers/conversationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getConversations);
router.post('/', getOrCreateConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessageHttp);
router.post('/:id/clear', clearChat);
router.patch('/:id/disappearing', setDisappearingTimer);
router.patch('/:id/read', markConversationAsRead);

export default router;
