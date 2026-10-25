import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Check, Clock, MessageSquare, X, ShieldAlert } from 'lucide-react';
import { userService } from '../services/userService';
import { friendService } from '../services/friendService';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import confetti from 'canvas-confetti';

export const UserSearchModal = ({ isOpen, onClose, onStartChat }) => {
  const { isUserOnline } = useSocket();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await userService.searchUsers(query);
        if (data.success) {
          setResults(data.users || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSendFriendRequest = async (targetUser) => {
    setActionLoadingId(targetUser.id);
    try {
      const data = await friendService.sendRequest(targetUser.id);
      if (data.success) {
        addToast(`Friend request sent to @${targetUser.username}`, 'success');
        // Update local result state
        setResults((prev) =>
          prev.map((u) =>
            u.id === targetUser.id
              ? { ...u, relationship: 'OUTGOING_REQUEST', requestId: data.request?.id }
              : u
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send friend request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (targetUser) => {
    if (!targetUser.requestId) return;
    setActionLoadingId(targetUser.id);
    try {
      const data = await friendService.updateRequestStatus(targetUser.requestId, 'ACCEPTED');
      if (data.success) {
        // Trigger celebratory confetti!
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#38bdf8', '#c084fc'],
        });

        addToast(`You are now friends with @${targetUser.username}!`, 'success');
        setResults((prev) =>
          prev.map((u) =>
            u.id === targetUser.id ? { ...u, relationship: 'FRIENDS' } : u
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setActionLoadingId(null);
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Find People on SHADO</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Search by username or display name to connect.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mt-4">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by @username or name..."
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
            />
            {loading && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Results List */}
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
            {results.length > 0 ? (
              results.map((targetUser) => (
                <div
                  key={targetUser.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 hover:border-violet-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={targetUser.avatarUrl}
                      name={targetUser.fullName}
                      size="md"
                      isOnline={isUserOnline(targetUser.id) || targetUser.isOnline}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {targetUser.fullName}
                      </div>
                      <div className="text-xs text-violet-500 dark:text-violet-400 truncate">
                        @{targetUser.username}
                      </div>
                      {targetUser.bio && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-[200px]">
                          {targetUser.bio}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Relationship Action */}
                  <div className="shrink-0 ml-2">
                    {targetUser.relationship === 'FRIENDS' ? (
                      <button
                        onClick={() => {
                          onClose();
                          onStartChat(targetUser);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        Message
                      </button>
                    ) : targetUser.relationship === 'OUTGOING_REQUEST' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 bg-slate-200/60 dark:bg-slate-800/80">
                        <Clock size={13} />
                        Pending
                      </span>
                    ) : targetUser.relationship === 'INCOMING_REQUEST' ? (
                      <button
                        disabled={actionLoadingId === targetUser.id}
                        onClick={() => handleAcceptRequest(targetUser)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                      >
                        <Check size={13} />
                        Accept
                      </button>
                    ) : (
                      <button
                        disabled={actionLoadingId === targetUser.id}
                        onClick={() => handleSendFriendRequest(targetUser)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-violet-500/50 hover:bg-violet-600 text-violet-600 dark:text-violet-300 hover:text-white transition-all cursor-pointer"
                      >
                        <UserPlus size={13} />
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : query.trim() && !loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No users found matching "<span className="text-violet-400">{query}</span>"
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Type a name or username above to search.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserSearchModal;
