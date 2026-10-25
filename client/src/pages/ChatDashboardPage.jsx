import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Users,
  UserPlus,
  Settings,
  Bell,
  Send,
  Smile,
  ArrowLeft,
  Check,
  CheckCheck,
  Info,
  ShieldAlert,
  UserMinus,
  Sparkles,
  Clock,
  MoreVertical,
  Trash2,
  X,
  Volume2,
  VolumeX,
  BellOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { conversationService } from '../services/conversationService';
import { friendService } from '../services/friendService';
import { userService } from '../services/userService';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import ThemeToggle from '../components/ThemeToggle';
import EmojiPicker from '../components/EmojiPicker';
import UserSearchModal from '../components/UserSearchModal';
import FriendRequestsModal from '../components/FriendRequestsModal';
import SettingsModal from '../components/SettingsModal';
import ClearChatModal from '../components/ClearChatModal';
import DisappearingMessagesModal from '../components/DisappearingMessagesModal';

const TIMER_LABELS = {
  OFF: 'Off',
  '5m': '5 minutes',
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '90d': '90 days',
};

const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Offline';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Offline';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 45) return 'Active just now';
  if (diffMin < 60) return `Active ${diffMin}m ago`;
  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

export const ChatDashboardPage = () => {
  const { user } = useAuth();
  const {
    socket,
    isUserOnline,
    onlineUserIds,
    joinConversation,
    leaveConversation,
    markMessagesAsRead,
    sendMessage,
    sendTyping,
    typingMap,
    isSoundMuted,
    toggleSoundMute,
    playNotificationSound,
  } = useSocket();
  const { addToast } = useToast();

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'friends'
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Modals
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [clearChatLoading, setClearChatLoading] = useState(false);
  const [disappearingLoading, setDisappearingLoading] = useState(false);
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);

  // References
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const composerInputRef = useRef(null);
  const menuDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(e.target)) {
        setShowMenuDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close right sidebar or dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMenuDropdown(false);
        setShowRightSidebar(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch initial conversations & friends
  const loadConversations = useCallback(async () => {
    try {
      const data = await conversationService.getConversations();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const data = await friendService.getFriends();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }, []);

  const checkIncomingRequests = useCallback(async () => {
    try {
      const data = await friendService.getIncomingRequests();
      if (data.success) {
        setIncomingRequestsCount(data.requests?.length || 0);
      }
    } catch (err) {
      console.error('Failed to check incoming requests:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadFriends();
    checkIncomingRequests();
  }, [loadConversations, loadFriends, checkIncomingRequests]);

  // Load message history when selected conversation changes
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const conversationId = selectedConversation.id;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await conversationService.getMessages(conversationId);
        if (data.success) {
          setMessages(data.messages || []);
          if (data.disappearingTimer) {
            setSelectedConversation((prev) =>
              prev ? { ...prev, disappearingTimer: data.disappearingTimer } : prev
            );
          }
          // Join socket room
          joinConversation(conversationId);

          // Clear local unread count for this conversation
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      leaveConversation(conversationId);
    };
  }, [selectedConversation?.id, joinConversation, leaveConversation]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for real-time messages & updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      // If message is for currently active conversation
      if (selectedConversation && newMsg.conversationId === selectedConversation.id) {
        // If recipient is viewing the conversation, mark it as read immediately
        if (newMsg.senderId !== user?.id) {
          markMessagesAsRead(selectedConversation.id, [newMsg.id]);
          newMsg.status = 'READ';
          newMsg.readAt = new Date().toISOString();
        }

        setMessages((prev) => {
          // Prevent duplicates (e.g. if optimistic tempId was replaced)
          if (newMsg.tempId) {
            const index = prev.findIndex((m) => m.id === newMsg.tempId);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = newMsg;
              return updated;
            }
          }
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      // Update conversations list snippet & unread count
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === newMsg.conversationId);
        if (index === -1) {
          // If conversation wasn't listed, reload conversations
          loadConversations();
          return prev;
        }
        const updated = [...prev];
        const isCurrentlyActive = selectedConversation?.id === newMsg.conversationId;
        updated[index] = {
          ...updated[index],
          lastMessage: newMsg,
          updatedAt: newMsg.createdAt,
          unreadCount: isCurrentlyActive ? 0 : (updated[index].unreadCount || 0) + 1,
        };
        // Re-sort to top
        updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return updated;
      });
    };

    const handleDelivered = ({ messageId, tempId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: messageId, status } : m))
      );
    };

    // Real-time read receipts (marks ticks blue instantly)
    const handleMessagesRead = ({ conversationId, messageIds, readAt }) => {
      if (selectedConversation && conversationId === selectedConversation.id) {
        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m.id)
              ? { ...m, status: 'READ', readAt: readAt || new Date().toISOString() }
              : m
          )
        );
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            const updatedLast =
              c.lastMessage && messageIds.includes(c.lastMessage.id)
                ? { ...c.lastMessage, status: 'READ', readAt: readAt || new Date().toISOString() }
                : c.lastMessage;
            return { ...c, lastMessage: updatedLast, unreadCount: 0 };
          }
          return c;
        })
      );
    };

    // Real-time status update (e.g. DELIVERED on recipient connection)
    const handleStatusUpdate = ({ conversationId, messageIds, status, deliveredAt }) => {
      if (selectedConversation && conversationId === selectedConversation.id) {
        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m.id)
              ? { ...m, status, deliveredAt: deliveredAt || m.deliveredAt }
              : m
          )
        );
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.lastMessage && messageIds.includes(c.lastMessage.id)) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status,
                deliveredAt: deliveredAt || c.lastMessage.deliveredAt,
              },
            };
          }
          return c;
        })
      );
    };

    const handleFriendUpdate = () => {
      loadFriends();
      loadConversations();
      checkIncomingRequests();
    };

    const handleIncomingRequest = () => {
      checkIncomingRequests();
    };

    // Real-time message expiration
    const handleMessagesExpired = ({ conversationId, messageIds }) => {
      if (selectedConversation && conversationId === selectedConversation.id) {
        setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)));
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.lastMessage && messageIds.includes(c.lastMessage.id)) {
            return { ...c, lastMessage: null };
          }
          return c;
        })
      );
    };

    // Real-time chat clear (for the requesting user)
    const handleChatCleared = ({ conversationId }) => {
      if (selectedConversation && conversationId === selectedConversation.id) {
        setMessages([]);
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c))
      );
    };

    // Real-time disappearing timer update
    const handleTimerUpdate = ({ conversationId, disappearingTimer, updatedBy }) => {
      if (selectedConversation && conversationId === selectedConversation.id) {
        setSelectedConversation((prev) => ({
          ...prev,
          disappearingTimer,
        }));
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, disappearingTimer } : c))
      );
      if (updatedBy && updatedBy.id !== user?.id) {
        const label = TIMER_LABELS[disappearingTimer] || disappearingTimer;
        addToast(`${updatedBy.fullName} set disappearing messages to ${label}`, 'info');
      }
    };

    // Real-time presence update (updates conversation, active chat header, and friends)
    const handlePresenceUpdate = ({ userId, isOnline, lastSeenAt }) => {
      setSelectedConversation((prev) => {
        if (!prev || prev.recipient?.id !== userId) return prev;
        return {
          ...prev,
          recipient: {
            ...prev.recipient,
            isOnline,
            lastSeenAt: lastSeenAt || (isOnline ? prev.recipient.lastSeenAt : new Date().toISOString()),
          },
        };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.recipient?.id === userId
            ? {
                ...c,
                recipient: {
                  ...c.recipient,
                  isOnline,
                  lastSeenAt: lastSeenAt || (isOnline ? c.recipient.lastSeenAt : new Date().toISOString()),
                },
              }
            : c
        )
      );

      setFriends((prev) =>
        prev.map((f) =>
          f.id === userId
            ? {
                ...f,
                isOnline,
                lastSeenAt: lastSeenAt || (isOnline ? f.lastSeenAt : new Date().toISOString()),
              }
            : f
        )
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:delivered', handleDelivered);
    socket.on('messages:read', handleMessagesRead);
    socket.on('messages:status_update', handleStatusUpdate);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('friend:update', handleFriendUpdate);
    socket.on('friend:request:incoming', handleIncomingRequest);
    socket.on('messages:expired', handleMessagesExpired);
    socket.on('chat:cleared', handleChatCleared);
    socket.on('conversation:timer_update', handleTimerUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:delivered', handleDelivered);
      socket.off('messages:read', handleMessagesRead);
      socket.off('messages:status_update', handleStatusUpdate);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('friend:update', handleFriendUpdate);
      socket.off('friend:request:incoming', handleIncomingRequest);
      socket.off('messages:expired', handleMessagesExpired);
      socket.off('chat:cleared', handleChatCleared);
      socket.off('conversation:timer_update', handleTimerUpdate);
    };
  }, [
    socket,
    selectedConversation,
    loadConversations,
    loadFriends,
    checkIncomingRequests,
    markMessagesAsRead,
    addToast,
    user?.id,
  ]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (!selectedConversation) return;

    sendTyping(selectedConversation.id, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedConversation.id, false);
    }, 1500);
  };

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const content = messageInput.trim();
    if (!content || !selectedConversation) return;

    setMessageInput('');
    sendTyping(selectedConversation.id, false);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversationId: selectedConversation.id,
      senderId: user.id,
      content,
      status: 'SENDING',
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
    };

    // Optimistic UI append
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send through Socket.IO
    sendMessage(selectedConversation.id, content, (response) => {
      if (response && response.success && response.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? response.message : m))
        );
      }
    });

    // Re-focus composer
    composerInputRef.current?.focus();
  };

  // Clear chat history for the current user
  const handleConfirmClearChat = async () => {
    if (!selectedConversation) return;
    setClearChatLoading(true);
    try {
      const res = await conversationService.clearChat(selectedConversation.id);
      if (res.success) {
        setMessages([]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, lastMessage: null, unreadCount: 0 } : c
          )
        );
        setShowClearModal(false);
        setShowMenuDropdown(false);
        addToast('Chat history cleared for you', 'success');
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
      addToast(err.response?.data?.message || 'Failed to clear chat', 'error');
    } finally {
      setClearChatLoading(false);
    }
  };

  // Update disappearing messages timer
  const handleSaveDisappearingTimer = async (timer) => {
    if (!selectedConversation) return;
    setDisappearingLoading(true);
    try {
      const res = await conversationService.setDisappearingTimer(selectedConversation.id, timer);
      if (res.success) {
        const updatedTimer = res.disappearingTimer;
        setSelectedConversation((prev) =>
          prev ? { ...prev, disappearingTimer: updatedTimer } : prev
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, disappearingTimer: updatedTimer } : c
          )
        );
        setShowDisappearingModal(false);
        setShowMenuDropdown(false);
        const label = TIMER_LABELS[updatedTimer] || updatedTimer;
        addToast(
          updatedTimer === 'OFF'
            ? 'Disappearing messages turned off'
            : `Disappearing messages set to ${label}`,
          'success'
        );
      }
    } catch (err) {
      console.error('Failed to set disappearing timer:', err);
      addToast(err.response?.data?.message || 'Failed to update timer', 'error');
    } finally {
      setDisappearingLoading(false);
    }
  };

  // Start chat with user (from Search, Friends list, or empty state)
  const handleStartChatWithUser = async (targetUser) => {
    try {
      const data = await conversationService.getOrCreateConversation(targetUser.id);
      if (data.success && data.conversation) {
        const conv = data.conversation;
        setSelectedConversation(conv);
        // Ensure conversation is in local list
        setConversations((prev) => {
          if (!prev.some((c) => c.id === conv.id)) {
            return [conv, ...prev];
          }
          return prev;
        });
        setActiveTab('chats');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to start chat', 'error');
    }
  };

  // Format date separators
  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Current active typing users in selected conversation
  const currentTypingUsers =
    selectedConversation && typingMap[selectedConversation.id]
      ? typingMap[selectedConversation.id].filter((u) => u.userId !== user?.id)
      : [];

  const filteredConversations = conversations.filter((c) => {
    const name = c.name || c.recipient?.fullName || '';
    const username = c.recipient?.username || '';
    const q = searchFilter.toLowerCase();
    return name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
  });

  const onlineFriends = friends.filter((f) => isUserOnline(f.id) || f.isOnline);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#f8fafc] dark:bg-[#07080c] text-slate-800 dark:text-slate-100 transition-colors select-none">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: Conversations, Friends, Search, Settings */}
      {/* ======================================================== */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c0e17]/90 backdrop-blur-xl flex flex-col shrink-0 transition-all ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <Logo size="sm" showTagline={false} />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Find People"
            >
              <UserPlus size={18} />
            </button>

            <button
              onClick={() => setShowRequestsModal(true)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Friend Requests"
            >
              <Bell size={18} />
              {incomingRequestsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-violet-600 ring-2 ring-white dark:ring-[#0c0e17] animate-pulse" />
              )}
            </button>

            <ThemeToggle compact={true} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121522] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>
        </div>

        {/* Tab Switcher: Chats vs Friends */}
        <div className="flex px-3 border-b border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'chats'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare size={14} />
            Chats
            {activeTab === 'chats' && (
              <motion.div
                layoutId="sidebar-tab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'friends'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users size={14} />
            Friends ({friends.length})
            {activeTab === 'friends' && (
              <motion.div
                layoutId="sidebar-tab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600"
              />
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeTab === 'chats' ? (
            filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const isOnline = conv.recipient
                  ? isUserOnline(conv.recipient.id) || conv.recipient.isOnline
                  : false;
                const isTyping =
                  typingMap[conv.id] &&
                  typingMap[conv.id].some((u) => u.userId !== user?.id);

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Avatar
                      src={conv.recipient?.avatarUrl}
                      name={conv.recipient?.fullName || conv.name}
                      size="md"
                      isOnline={isOnline}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {conv.recipient?.fullName || conv.name}
                        </span>
                        {conv.lastMessage && (
                          <span
                            className={`text-[10px] shrink-0 ml-1 ${
                              isSelected ? 'text-violet-200' : 'text-slate-400'
                            }`}
                          >
                            {formatMessageTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <div
                          className={`text-xs truncate flex items-center ${
                            isSelected
                              ? 'text-violet-100'
                              : isTyping
                              ? 'text-violet-500 font-semibold italic'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isTyping ? (
                            <span>typing...</span>
                          ) : conv.lastMessage ? (
                            <span className="flex items-center truncate min-w-0">
                              {conv.lastMessage.senderId === user?.id && (
                                <span className="inline-flex items-center shrink-0 mr-1.5">
                                  {conv.lastMessage.status === 'READ' ? (
                                    <CheckCheck size={13} className="text-sky-400 shrink-0" />
                                  ) : conv.lastMessage.status === 'DELIVERED' ? (
                                    <CheckCheck
                                      size={13}
                                      className={
                                        isSelected ? 'text-violet-200 shrink-0' : 'text-slate-400 shrink-0'
                                      }
                                    />
                                  ) : (
                                    <Check
                                      size={12}
                                      className={
                                        isSelected ? 'text-violet-200 shrink-0' : 'text-slate-400 shrink-0'
                                      }
                                    />
                                  )}
                                </span>
                              )}
                              <span className="truncate">{conv.lastMessage.content}</span>
                            </span>
                          ) : (
                            'No messages yet'
                          )}
                        </div>

                        {conv.unreadCount > 0 && !isSelected && (
                          <span className="shrink-0 ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-600 text-white shadow-sm">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No conversations yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                  Find friends using search to begin messaging.
                </p>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all cursor-pointer"
                >
                  Find People
                </button>
              </div>
            )
          ) : (
            /* Friends List View */
            <div className="space-y-4">
              {/* Online Friends Rail */}
              {onlineFriends.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online Friends ({onlineFriends.length})
                  </div>
                  <div className="space-y-1">
                    {onlineFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={friend.avatarUrl}
                            name={friend.fullName}
                            size="sm"
                            isOnline={true}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{friend.fullName}</div>
                            <div className="text-[10px] text-violet-500 truncate">@{friend.username}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartChatWithUser(friend)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all cursor-pointer"
                        >
                          Message
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Friends */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  All Friends ({friends.length})
                </div>
                {friends.length > 0 ? (
                  <div className="space-y-1">
                    {friends.map((friend) => {
                      const isOnline = isUserOnline(friend.id) || friend.isOnline;
                      return (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              src={friend.avatarUrl}
                              name={friend.fullName}
                              size="sm"
                              isOnline={isOnline}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{friend.fullName}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                @{friend.username}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartChatWithUser(friend)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white transition-all cursor-pointer"
                          >
                            Chat
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">
                    You haven't added any friends yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Current User Profile Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#0a0c14]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" isOnline={true} />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                {user?.fullName}
              </div>
              <div className="text-[10px] text-violet-500 font-medium truncate">
                @{user?.username}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                toggleSoundMute();
                addToast(
                  isSoundMuted ? 'Notification sounds enabled' : 'Notification sounds muted',
                  'info'
                );
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isSoundMuted
                  ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title={isSoundMuted ? 'Notification sounds muted — Click to unmute' : 'Notification sounds enabled — Click to mute'}
              aria-label={isSoundMuted ? 'Unmute notification sounds' : 'Mute notification sounds'}
            >
              {isSoundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. CENTER AREA: Active Conversation or Empty State        */}
      {/* ======================================================== */}
      <main
        className={`flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#07080c] relative overflow-hidden ${
          !selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <header className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c0e17]/90 backdrop-blur-xl flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>

                <Avatar
                  src={selectedConversation.recipient?.avatarUrl}
                  name={selectedConversation.recipient?.fullName || selectedConversation.name}
                  size="md"
                  isOnline={
                    selectedConversation.recipient
                      ? (isUserOnline(selectedConversation.recipient.id) || selectedConversation.recipient.isOnline)
                      : false
                  }
                />

                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedConversation.recipient?.fullName || selectedConversation.name}
                  </h2>
                  <div className="text-[11px] flex items-center gap-1.5">
                    {selectedConversation.recipient &&
                    (isUserOnline(selectedConversation.recipient.id) || selectedConversation.recipient.isOnline) ? (
                      <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Active now
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                        {formatLastSeen(selectedConversation.recipient?.lastSeenAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Active Disappearing Messages Badge */}
                {selectedConversation.disappearingTimer &&
                  selectedConversation.disappearingTimer !== 'OFF' && (
                    <button
                      onClick={() => setShowDisappearingModal(true)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors cursor-pointer"
                      title="Disappearing messages enabled"
                    >
                      <Clock size={12} className="animate-pulse" />
                      <span>{TIMER_LABELS[selectedConversation.disappearingTimer] || selectedConversation.disappearingTimer}</span>
                    </button>
                  )}

                {/* Mute / Unmute Notification Sounds Quick Button */}
                <button
                  onClick={() => {
                    toggleSoundMute();
                    addToast(
                      isSoundMuted ? 'Notification sounds enabled' : 'Notification sounds muted',
                      'info'
                    );
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isSoundMuted
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title={isSoundMuted ? 'Notification sounds muted — Click to unmute' : 'Notification sounds enabled — Click to mute'}
                  aria-label={isSoundMuted ? 'Unmute notification sounds' : 'Mute notification sounds'}
                >
                  {isSoundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <button
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    showRightSidebar
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title="Conversation Details"
                >
                  <Info size={18} />
                </button>

                {/* Three-dot Chat Menu Dropdown */}
                <div className="relative" ref={menuDropdownRef}>
                  <button
                    onClick={() => setShowMenuDropdown((prev) => !prev)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showMenuDropdown
                        ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                    title="Chat Options"
                    aria-label="Chat Options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  <AnimatePresence>
                    {showMenuDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-white dark:bg-[#121522] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 backdrop-blur-xl"
                      >
                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            toggleSoundMute();
                            addToast(
                              isSoundMuted ? 'Notification sounds enabled' : 'Notification sounds muted',
                              'info'
                            );
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {isSoundMuted ? (
                              <VolumeX size={15} className="text-amber-500" />
                            ) : (
                              <Volume2 size={15} className="text-violet-500" />
                            )}
                            <span>Notification Sounds</span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSoundMuted
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isSoundMuted ? 'Muted' : 'On'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            setShowDisappearingModal(true);
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock size={15} className="text-violet-500" />
                            <span>Disappearing Messages</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            {TIMER_LABELS[selectedConversation.disappearingTimer] || 'Off'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            setShowClearModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                        >
                          <Trash2 size={15} />
                          <span>Clear Chat</span>
                        </button>

                        <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            setShowRightSidebar(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                        >
                          <Info size={15} className="text-slate-400" />
                          <span>Contact Info</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {/* Disappearing Messages System Banner */}
              {selectedConversation.disappearingTimer &&
                selectedConversation.disappearingTimer !== 'OFF' && (
                  <div className="flex items-center justify-center my-2">
                    <button
                      onClick={() => setShowDisappearingModal(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-all cursor-pointer shadow-xs"
                      title="Click to change disappearing messages timer"
                    >
                      <Clock size={12} className="text-violet-500 shrink-0" />
                      <span>
                        Messages disappear{' '}
                        <strong>{TIMER_LABELS[selectedConversation.disappearingTimer]}</strong>{' '}
                        after being sent. Tap to change.
                      </span>
                    </button>
                  </div>
                )}
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.id;
                  const prevMsg = messages[index - 1];
                  const showDate =
                    !prevMsg ||
                    formatMessageDate(prevMsg.createdAt) !== formatMessageDate(msg.createdAt);

                  return (
                    <React.Fragment key={msg.id || index}>
                      {/* Date Separator */}
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 shadow-xs">
                            {formatMessageDate(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <Avatar
                            src={msg.sender?.avatarUrl}
                            name={msg.sender?.fullName}
                            size="xs"
                            showStatus={false}
                          />
                        )}

                        <div className={`max-w-[75%] sm:max-w-[65%] space-y-1`}>
                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed select-text ${
                              isMe
                                ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-violet-600/20'
                                : 'bg-white dark:bg-[#151825] text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-800 shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>

                          {/* Timestamp & Status */}
                          <div
                            className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${
                              isMe ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {msg.expiresAt && (
                              <span
                                title="Disappearing message"
                                className="text-violet-500 dark:text-violet-400 flex items-center shrink-0"
                              >
                                <Clock size={10} />
                              </span>
                            )}
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span className="flex items-center ml-0.5">
                                {msg.status === 'SENDING' ? (
                                  <Clock size={11} className="text-slate-400" title="Sending..." />
                                ) : msg.status === 'READ' ? (
                                  <CheckCheck
                                    size={14}
                                    className="text-sky-400 dark:text-sky-400 shrink-0 drop-shadow-[0_0_2px_rgba(56,189,248,0.6)]"
                                    title={
                                      msg.readAt
                                        ? `Read ${formatMessageTime(msg.readAt)}`
                                        : 'Read'
                                    }
                                  />
                                ) : msg.status === 'DELIVERED' ? (
                                  <CheckCheck
                                    size={14}
                                    className="text-slate-300 dark:text-slate-400 shrink-0"
                                    title={
                                      msg.deliveredAt
                                        ? `Delivered ${formatMessageTime(msg.deliveredAt)}`
                                        : 'Delivered'
                                    }
                                  />
                                ) : (
                                  <Check
                                    size={13}
                                    className="text-slate-300 dark:text-slate-400 shrink-0"
                                    title="Sent to server"
                                  />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-3xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    This is the beginning of your chat history.
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Send a message below to start your conversation in real time.
                  </p>
                </div>
              )}

              {/* Typing indicator bubble */}
              {currentTypingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
                  <div className="flex gap-1 items-center px-3 py-2 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                  <span>
                    {currentTypingUsers.map((u) => u.fullName).join(', ')} is typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer Area */}
            <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c0e17]/90 backdrop-blur-xl relative">
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={(emoji) => setMessageInput((prev) => prev + emoji)}
              />

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-violet-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="Insert Emoji"
                >
                  <Smile size={20} />
                </button>

                <input
                  ref={composerInputRef}
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder={`Message ${
                    selectedConversation.recipient?.fullName || 'in conversation'
                  }...`}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121522] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/20 disabled:opacity-40 disabled:hover:from-violet-600 transition-all cursor-pointer"
                  title="Send Message"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State: No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px]" />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 max-w-md space-y-5"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-sky-500/20 border border-violet-500/30 flex items-center justify-center mx-auto shadow-xl">
                <Logo size="lg" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Every great conversation starts somewhere.
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select an existing conversation from the sidebar, or search registered users to expand your space.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="px-6 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex items-center gap-2 mx-auto"
                >
                  <UserPlus size={16} />
                  <span>Find People</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. RIGHT SIDEBAR: Recipient Profile & Conversation Info   */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedConversation && showRightSidebar && selectedConversation.recipient && (
          <motion.aside
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 320 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.25 }}
            className="border-l border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c0e17]/90 backdrop-blur-xl flex flex-col shrink-0 overflow-y-auto z-20"
          >
            {/* Sidebar Top Header with Cancel / Close Button */}
            <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#0c0e17]/50">
              <div className="flex items-center gap-2 min-w-0">
                <Info size={16} className="text-violet-500 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  Contact Info
                </h3>
              </div>
              <button
                onClick={() => setShowRightSidebar(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                title="Cancel and close"
                aria-label="Cancel and close"
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
            </div>

            <div className="p-6 text-center border-b border-slate-200 dark:border-slate-800/80">
              <Avatar
                src={selectedConversation.recipient.avatarUrl}
                name={selectedConversation.recipient.fullName}
                size="xl"
                isOnline={
                  isUserOnline(selectedConversation.recipient.id) ||
                  selectedConversation.recipient.isOnline
                }
                className="mx-auto mb-3"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedConversation.recipient.fullName}
              </h3>
              <p className="text-xs text-violet-500 font-medium">
                @{selectedConversation.recipient.username}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs">
                {isUserOnline(selectedConversation.recipient.id) ||
                selectedConversation.recipient.isOnline ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Active now
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                    <Clock size={12} />
                    {formatLastSeen(selectedConversation.recipient?.lastSeenAt)}
                  </span>
                )}
              </div>
              {selectedConversation.recipient.bio && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-4 leading-relaxed">
                  {selectedConversation.recipient.bio}
                </p>
              )}
            </div>

            {/* Conversation Details & Safety */}
            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Conversation Details
                </h4>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121522] border border-slate-200/60 dark:border-slate-800/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Type</span>
                    <span className="font-semibold capitalize">{selectedConversation.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Messages</span>
                    <span className="font-semibold">{messages.length}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-violet-500" />
                      <span className="text-slate-400">Disappearing</span>
                    </div>
                    <button
                      onClick={() => setShowDisappearingModal(true)}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors cursor-pointer"
                    >
                      {TIMER_LABELS[selectedConversation.disappearingTimer] || 'Off'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Privacy Controls */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setShowClearModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                  Clear Chat History
                </button>

                <button
                  onClick={async () => {
                    try {
                      await userService.blockUser(selectedConversation.recipient.id);
                      addToast(`Blocked @${selectedConversation.recipient.username}`, 'info');
                    } catch (_err) {
                      addToast('Failed to block user', 'error');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                >
                  <ShieldAlert size={15} />
                  Block User
                </button>

                <button
                  onClick={async () => {
                    try {
                      await friendService.removeFriend(selectedConversation.recipient.id);
                      addToast(`Removed from friends`, 'info');
                      loadFriends();
                    } catch (_err) {
                      addToast('Failed to remove friend', 'error');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <UserMinus size={15} />
                  Remove Friend
                </button>

                <button
                  onClick={() => setShowRightSidebar(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer mt-2"
                >
                  <X size={15} />
                  Cancel
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 4. MODALS: User Search, Friend Requests, Settings, etc.  */}
      {/* ======================================================== */}
      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onStartChat={(targetUser) => handleStartChatWithUser(targetUser)}
      />

      <FriendRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        onFriendAccepted={() => {
          loadFriends();
          loadConversations();
          checkIncomingRequests();
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ClearChatModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleConfirmClearChat}
        isLoading={clearChatLoading}
        recipientName={
          selectedConversation?.recipient?.fullName ||
          selectedConversation?.name ||
          'this conversation'
        }
      />

      <DisappearingMessagesModal
        isOpen={showDisappearingModal}
        onClose={() => setShowDisappearingModal(false)}
        currentTimer={selectedConversation?.disappearingTimer || 'OFF'}
        onSave={handleSaveDisappearingTimer}
        isLoading={disappearingLoading}
        recipientName={
          selectedConversation?.recipient?.fullName || selectedConversation?.name
        }
      />
    </div>
  );
};

export default ChatDashboardPage;
