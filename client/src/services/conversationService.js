import api from './api';

export const conversationService = {
  getConversations: async () => {
    const res = await api.get('/conversations');
    return res.data;
  },

  getOrCreateConversation: async (recipientId) => {
    const res = await api.post('/conversations', { recipientId });
    return res.data;
  },

  getMessages: async (conversationId, limit = 50, before = null) => {
    const params = new URLSearchParams({ limit });
    if (before) params.append('before', before);
    const res = await api.get(`/conversations/${conversationId}/messages?${params.toString()}`);
    return res.data;
  },

  sendMessage: async (conversationId, content) => {
    const res = await api.post(`/conversations/${conversationId}/messages`, { content });
    return res.data;
  },

  clearChat: async (conversationId) => {
    const res = await api.post(`/conversations/${conversationId}/clear`);
    return res.data;
  },

  setDisappearingTimer: async (conversationId, timer) => {
    const res = await api.patch(`/conversations/${conversationId}/disappearing`, { timer });
    return res.data;
  },

  markAsRead: async (conversationId) => {
    const res = await api.patch(`/conversations/${conversationId}/read`);
    return res.data;
  },
};

