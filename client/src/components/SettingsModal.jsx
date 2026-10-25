import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Palette,
  Shield,
  Trash2,
  LogOut,
  X,
  Check,
  AlertTriangle,
  Moon,
  Sun,
  Laptop,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { userService } from '../services/userService';
import Avatar from './Avatar';

const AVATAR_SEEDS = ['Shadow', 'Vortex', 'Cyber', 'Neon', 'Echo', 'Phoenix', 'Nova', 'Pulse'];

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const { theme, changeTheme } = useTheme();
  const { addToast } = useToast();
  const { isSoundMuted, toggleSoundMute, playNotificationSound } = useSocket();

  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const data = await userService.getBlockedUsers();
      if (data.success) {
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'privacy') {
      loadBlockedUsers();
    }
  }, [isOpen, activeTab, loadBlockedUsers]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await userService.updateProfile({ fullName, username, bio, avatarUrl });
      if (data.success) {
        updateUser(data.user);
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await userService.changePassword(currentPassword, newPassword, confirmPassword);
      if (data.success) {
        addToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedId) => {
    try {
      const data = await userService.unblockUser(blockedId);
      if (data.success) {
        addToast('User unblocked', 'info');
        setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId));
      }
    } catch (err) {
      addToast('Failed to unblock user', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await userService.deleteAccount();
      addToast('Account deleted successfully', 'info');
      onClose();
      logout();
    } catch (err) {
      addToast('Failed to delete account', 'error');
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
          className="relative w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121520] shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row max-h-[85vh]"
        >
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-56 p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 shrink-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Settings</h3>
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'My Profile', icon: User },
                { id: 'notifications', label: 'Sound & Alerts', icon: Bell },
                { id: 'appearance', label: 'Appearance', icon: Palette },
                { id: 'security', label: 'Security', icon: Lock },
                { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Close Button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Profile Information</h4>
                  <p className="text-xs text-slate-500">Customize how you appear to others on SHADO.</p>
                </div>

                {/* Avatar Preview & Presets */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Avatar</label>
                  <div className="flex items-center gap-4">
                    <Avatar src={avatarUrl} name={fullName} size="lg" />
                    <div>
                      <div className="text-xs text-slate-500 mb-2">Select a preset avatar seed:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {AVATAR_SEEDS.map((seed) => {
                          const url = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=7c3aed,3b82f6,6366f1&textColor=ffffff`;
                          return (
                            <button
                              key={seed}
                              type="button"
                              onClick={() => setAvatarUrl(url)}
                              className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-colors cursor-pointer ${
                                avatarUrl === url
                                  ? 'border-violet-500 bg-violet-500/10 text-violet-500 font-semibold'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {seed}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Full Name
                    </label>
                    <span className="text-[10px] text-violet-500 font-medium">Editable anytime</span>
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Your display name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Username
                    </label>
                    <span className="text-[10px] text-violet-500 font-medium">Editable anytime</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      required
                      placeholder="username"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">3–20 characters (letters, numbers, _, -). Change as often as you like.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Bio / Status
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell friends a little about yourself..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* Sound & Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Sound & Notifications</h4>
                  <p className="text-xs text-slate-500">Manage incoming message chimes and notification behavior.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isSoundMuted ? 'bg-amber-500/10 text-amber-500' : 'bg-violet-500/10 text-violet-500'
                      }`}
                    >
                      {isSoundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Incoming Message Chime
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Play a gentle, recognizable two-tone acoustic chime when receiving messages.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => playNotificationSound(true)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Test chime sound"
                    >
                      Test Chime
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSoundMute();
                        addToast(
                          isSoundMuted ? 'Notification sounds enabled' : 'Notification sounds muted',
                          'info'
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        !isSoundMuted ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      aria-label="Toggle sound notifications"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          !isSoundMuted ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Theme & Appearance</h4>
                  <p className="text-xs text-slate-500">Choose your preferred visual presentation for SHADO.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep graphite & electric violet' },
                    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean, high-clarity daylight theme' },
                    { id: 'system', label: 'System Default', icon: Laptop, desc: 'Syncs with your device settings' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => changeTheme(item.id)}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Icon size={20} className={isSelected ? 'text-violet-500' : 'text-slate-400'} />
                          {isSelected && <Check size={16} className="text-violet-500" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Change Password</h4>
                  <p className="text-xs text-slate-500">Ensure your account is secure with a strong password.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all cursor-pointer"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            {/* Privacy & Safety Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Privacy & Safety</h4>
                  <p className="text-xs text-slate-500">Manage blocked users and sensitive account settings.</p>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Blocked Accounts ({blockedUsers.length})
                  </h5>
                  {blockedUsers.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {blockedUsers.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar src={b.avatarUrl} name={b.fullName} size="sm" showStatus={false} />
                            <div>
                              <div className="text-xs font-bold">{b.fullName}</div>
                              <div className="text-[10px] text-slate-400">@{b.username}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblock(b.id)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">You haven't blocked any users.</p>
                  )}
                </div>

                {/* Danger Zone */}
                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 mt-6">
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-sm mb-1">
                    <AlertTriangle size={16} />
                    Danger Zone
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Permanently delete your SHADO account, messages, and friend relationships. This cannot be undone.
                  </p>
                  {deleteConfirm ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                      >
                        Yes, Permanently Delete My Account
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-rose-500/40 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      Delete Account
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;
