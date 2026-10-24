import express from 'express';
import {
  sendRequest,
  getIncomingRequests,
  getOutgoingRequests,
  updateRequestStatus,
  cancelRequest,
  getFriends,
  removeFriend,
} from '../controllers/friendController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/requests', sendRequest);
router.get('/requests/incoming', getIncomingRequests);
router.get('/requests/outgoing', getOutgoingRequests);
router.patch('/requests/:id', updateRequestStatus);
router.delete('/requests/:id', cancelRequest);

router.get('/', getFriends);
router.delete('/:id', removeFriend);

export default router;
