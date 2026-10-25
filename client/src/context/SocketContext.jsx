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

  // Mute sound preference (persisted in localStorage)
  const [isSoundMuted, setIsSoundMutedState] = useState(() => {
    try {
      return localStorage.getItem('shado_sound_muted') === 'true';
    } catch {
      return false;
    }
  });

  const audioCtxRef = useRef(null);
  const lastSoundPlayedRef = useRef(0);

  const setIsSoundMuted = useCallback((muted) => {
    setIsSoundMutedState(muted);
    try {
      localStorage.setItem('shado_sound_muted', muted ? 'true' : 'false');
    } catch {}
  }, []);

  /**
   * Synthesize a short, pleasant, recognizable messaging chime.
   * Feels familiar, professional, and satisfying—warm two-tone acoustic marimba/bell (G5 -> C6).
   * Not loud, annoying, or futuristic.
   */
  const playNotificationSound = useCallback(
    (force = false) => {
      if (!force && isSoundMuted) return;

      // Throttle rapid incoming sound triggers (min 150ms between chimes)
      const now = Date.now();
      if (now - lastSoundPlayedRef.current < 150) return;
      lastSoundPlayedRef.current = now;

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const startTime = ctx.currentTime;

        // Master lowpass filter produces a smooth, warm acoustic tone without harsh high frequencies
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, startTime);
        filter.Q.setValueAtTime(1.1, startTime);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.14, startTime); // Pleasant, clear, non-jarring volume

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        const playTone = (freq, time, duration, peak = 1.0) => {
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, time);

          // Subtle warm harmonic overtone
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 2, time);

          const noteGain = ctx.createGain();
          noteGain.gain.setValueAtTime(0.0001, time);
          noteGain.gain.linearRampToValueAtTime(peak, time + 0.005);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

          const overtoneGain = ctx.createGain();
          overtoneGain.gain.setValueAtTime(0.08, time);

          osc1.connect(noteGain);
          osc2.connect(overtoneGain);
          overtoneGain.connect(noteGain);
          noteGain.connect(filter);

          osc1.start(time);
          osc1.stop(time + duration + 0.05);
          osc2.start(time);
          osc2.stop(time + duration + 0.05);
        };

        // Note 1: G5 (783.99 Hz)
        playTone(783.99, startTime, 0.12, 0.85);
        // Note 2: C6 (1046.50 Hz) - satisfying perfect fourth resolution
        playTone(1046.5, startTime + 0.085, 0.28, 1.0);
      } catch (e) {
        // Audio policy or unavailable
      }
    },
    [isSoundMuted]
  );

  const toggleSoundMute = useCallback(() => {
    setIsSoundMutedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('shado_sound_muted', next ? 'true' : 'false');
      } catch {}
      if (!next) {
        // Confirmation preview chime when unmuting
        setTimeout(() => playNotificationSound(true), 50);
      }
      return next;
    });
  }, [playNotificationSound]);

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
      // Mark current user online and query latest snapshot
      setOnlineUserIds((prev) => new Set(prev).add(user.id));
      newSocket.emit('presence:query');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time presence initialization snapshot from server
    newSocket.on('presence:init', ({ onlineUserIds: serverOnlineIds }) => {
      if (Array.isArray(serverOnlineIds)) {
        setOnlineUserIds(new Set([...serverOnlineIds, user.id]));
      }
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

    // Whenever a new message arrives from another person, play notification sound
    newSocket.on('message:new', (newMsg) => {
      if (newMsg && newMsg.senderId !== user?.id) {
        playNotificationSound();
      }
    });

    // Real-time notification updates
    newSocket.on('notification:new', (notif) => {
      playNotificationSound();
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
  }, [isAuthenticated, user?.id, addToast, playNotificationSound]);

  // Re-synchronize presence when tab gains focus or device comes back online
  useEffect(() => {
    const handleReSync = () => {
      if (socket && isConnected) {
        socket.emit('presence:query');
      }
    };

    window.addEventListener('focus', handleReSync);
    window.addEventListener('online', handleReSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleReSync);
      window.removeEventListener('online', handleReSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [socket, isConnected]);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      return onlineUserIds.has(userId);
    },
    [onlineUserIds]
  );

  const joinConversation = useCallback(
    (conversationId) => {
      if (socket && isConnected) {
        socket.emit('conversation:join', { conversationId });
      }
    },
    [socket, isConnected]
  );

  const leaveConversation = useCallback(
    (conversationId) => {
      if (socket && isConnected) {
        socket.emit('conversation:leave', { conversationId });
      }
    },
    [socket, isConnected]
  );

  const markMessagesAsRead = useCallback(
    (conversationId, messageIds) => {
      if (socket && isConnected) {
        socket.emit('messages:read', { conversationId, messageIds });
      }
    },
    [socket, isConnected]
  );

  const sendMessage = useCallback(
    (conversationId, content, callback) => {
      if (socket && isConnected) {
        const tempId = `temp-${Date.now()}`;
        socket.emit('message:send', { conversationId, content, tempId }, callback);
        return tempId;
      }
      return null;
    },
    [socket, isConnected]
  );

  const sendTyping = useCallback(
    (conversationId, isTyping) => {
      if (socket && isConnected) {
        socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
      }
    },
    [socket, isConnected]
  );

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
        playNotificationChime: playNotificationSound,
        playNotificationSound,
        isSoundMuted,
        setIsSoundMuted,
        toggleSoundMute,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
