import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingMap, setTypingMap] = useState({}); // conversationId -> Array of typing users

  // Synthesize soft pleasant notification chime using Web Audio API
  const playNotificationChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('shado_auth_token');
    
    // In production, dynamically connect to current origin (wss/ws) without hardcoded localhost.
    // In development on Vite dev port 5173, connect to backend port 5000 on the same hostname.
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (typeof window !== 'undefined' && window.location.port === '5173'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : typeof window !== 'undefined'
        ? window.location.origin
        : undefined);

    const newSocket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Mark current user online
      setOnlineUserIds((prev) => new Set(prev).add(user.id));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time presence updates
    newSocket.on('presence:update', ({ userId, isOnline }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Real-time notification updates
    newSocket.on('notification:new', (notif) => {
      playNotificationChime();
      addToast(notif.message, 'notification');
    });

    // Real-time typing indicators
    newSocket.on('typing:update', ({ conversationId, userId: typingUserId, fullName, isTyping }) => {
      setTypingMap((prev) => {
        const currentList = prev[conversationId] || [];
        if (isTyping) {
          if (!currentList.some((u) => u.userId === typingUserId)) {
            return {
              ...prev,
              [conversationId]: [...currentList, { userId: typingUserId, fullName }],
            };
          }
        } else {
          return {
            ...prev,
            [conversationId]: currentList.filter((u) => u.userId !== typingUserId),
          };
        }
        return prev;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id, addToast, playNotificationChime]);

  const isUserOnline = (userId) => {
    return onlineUserIds.has(userId);
  };

  const joinConversation = useCallback((conversationId) => {
    if (socket && isConnected) {
      socket.emit('conversation:join', { conversationId });
    }
  }, [socket, isConnected]);

  const leaveConversation = useCallback((conversationId) => {
    if (socket && isConnected) {
      socket.emit('conversation:leave', { conversationId });
    }
  }, [socket, isConnected]);

  const markMessagesAsRead = useCallback((conversationId, messageIds) => {
    if (socket && isConnected) {
      socket.emit('messages:read', { conversationId, messageIds });
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((conversationId, content, callback) => {
    if (socket && isConnected) {
      const tempId = `temp-${Date.now()}`;
      socket.emit('message:send', { conversationId, content, tempId }, callback);
      return tempId;
    }
    return null;
  }, [socket, isConnected]);

  const sendTyping = useCallback((conversationId, isTyping) => {
    if (socket && isConnected) {
      socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
    }
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isUserOnline,
        onlineUserIds,
        typingMap,
        joinConversation,
        leaveConversation,
        markMessagesAsRead,
        sendMessage,
        sendTyping,
        playNotificationChime,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
