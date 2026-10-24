import api from './api';

export const friendService = {
  sendRequest: async (receiverId) => {
    const res = await api.post('/friends/requests', { receiverId });
    return res.data;
  },

  getIncomingRequests: async () => {
    const res = await api.get('/friends/requests/incoming');
    return res.data;
  },

  getOutgoingRequests: async () => {
    const res = await api.get('/friends/requests/outgoing');
    return res.data;
  },

  updateRequestStatus: async (requestId, status) => {
    const res = await api.patch(`/friends/requests/${requestId}`, { status });
    return res.data;
  },

  cancelRequest: async (requestId) => {
    const res = await api.delete(`/friends/requests/${requestId}`);
    return res.data;
  },

  getFriends: async () => {
    const res = await api.get('/friends');
    return res.data;
  },

  removeFriend: async (friendId) => {
    const res = await api.delete(`/friends/${friendId}`);
    return res.data;
  },
};
