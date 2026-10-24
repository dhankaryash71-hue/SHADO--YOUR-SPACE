import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, UserCheck, Inbox, ArrowUpRight } from 'lucide-react';
import { friendService } from '../services/friendService';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import confetti from 'canvas-confetti';

export const FriendRequestsModal = ({ isOpen, onClose, onFriendAccepted }) => {
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const { addToast } = useToast();

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [incRes, outRes] = await Promise.all([
        friendService.getIncomingRequests(),
        friendService.getOutgoingRequests(),
      ]);
      if (incRes.success) setIncoming(incRes.requests || []);
      if (outRes.success) setOutgoing(outRes.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const handleRespond = async (requestId, status, senderName) => {
    setProcessingId(requestId);
    try {
      const data = await friendService.updateRequestStatus(requestId, status);
      if (data.success) {
        if (status === 'ACCEPTED') {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#38bdf8', '#a855f7'],
          });
          addToast(`Accepted friend request from ${senderName}!`, 'success');
          if (onFriendAccepted) onFriendAccepted();
        } else {
          addToast(`Declined friend request`, 'info');
        }
        setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId) => {
    setProcessingId(requestId);
    try {
      const data = await friendService.cancelRequest(requestId);
      if (data.success) {
        addToast('Friend request cancelled', 'info');
        setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121520] shadow-2xl p-6 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Friend Requests</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your incoming connections and pending requests.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800/80 mt-4">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 flex items-center justify-center gap-2 pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
                activeTab === 'incoming'
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Inbox size={16} />
              Incoming
              {incoming.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-600 text-white">
                  {incoming.length}
                </span>
              )}
              {activeTab === 'incoming' && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex-1 flex items-center justify-center gap-2 pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
                activeTab === 'outgoing'
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight size={16} />
              Sent
              {outgoing.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {outgoing.length}
                </span>
              )}
              {activeTab === 'outgoing' && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"
                />
              )}
            </button>
          </div>

          {/* List Content */}
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {activeTab === 'incoming' ? (
              incoming.length > 0 ? (
                incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={req.sender?.avatarUrl}
                        name={req.sender?.fullName}
                        size="md"
                        isOnline={req.sender?.isOnline}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {req.sender?.fullName}
                        </div>
                        <div className="text-xs text-violet-500 dark:text-violet-400 truncate">
                          @{req.sender?.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        disabled={processingId === req.id}
                        onClick={() => handleRespond(req.id, 'ACCEPTED', req.sender?.fullName)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                        title="Accept"
                      >
                        <Check size={14} />
                        Accept
                      </button>
                      <button
                        disabled={processingId === req.id}
                        onClick={() => handleRespond(req.id, 'DECLINED', req.sender?.fullName)}
                        className="p-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/40 transition-colors cursor-pointer"
                        title="Decline"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No incoming friend requests right now.
                </div>
              )
            ) : outgoing.length > 0 ? (
              outgoing.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={req.receiver?.avatarUrl}
                      name={req.receiver?.fullName}
                      size="md"
                      isOnline={req.receiver?.isOnline}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {req.receiver?.fullName}
                      </div>
                      <div className="text-xs text-violet-500 dark:text-violet-400 truncate">
                        @{req.receiver?.username}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={processingId === req.id}
                    onClick={() => handleCancel(req.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                No pending sent requests.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FriendRequestsModal;
