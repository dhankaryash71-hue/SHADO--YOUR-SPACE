import api from './api';

export const userService = {
  searchUsers: async (query) => {
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  getUserById: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await api.patch('/users/me', data);
    return res.data;
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const res = await api.post('/users/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res.data;
  },

  deleteAccount: async () => {
    const res = await api.delete('/users/me');
    return res.data;
  },

  blockUser: async (targetUserId) => {
    const res = await api.post('/users/block', { targetUserId });
    return res.data;
  },

  unblockUser: async (targetUserId) => {
    const res = await api.delete(`/users/block/${targetUserId}`);
    return res.data;
  },

  getBlockedUsers: async () => {
    const res = await api.get('/users/blocked');
    return res.data;
  },
};
