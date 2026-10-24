import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  ArrowRight,
  MessageSquare,
  CheckCheck,
  Sparkles,
  X,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please provide your username or email, and password.');
      return;
    }

    setLoading(true);
    try {
      await login(identifier, password);
      addToast('Welcome back to SHADO!', 'success');
      navigate('/chat');
    } catch (err) {
      const msg = err.response?.data?.message || err.friendlyMessage || err.message || 'Login failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    try {
      const data = await authService.forgotPassword(forgotEmail);
      addToast(data.message || 'Password reset link sent!', 'info');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      addToast('Failed to dispatch reset link', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#f8fafc] dark:bg-[#07080c] text-slate-800 dark:text-slate-100 overflow-hidden transition-colors select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-5 right-6 z-30 flex items-center gap-3">
        <ThemeToggle />
      </div>

      {/* ======================================================== */}
      {/* CHATS-RELATED BACKGROUND DECORATION                      */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Ambient Radial Spotlights */}
        <div className="absolute -top-[15%] left-[10%] w-[550px] h-[550px] rounded-full bg-violet-600/15 dark:bg-violet-600/20 blur-[130px]" />
        <div className="absolute -bottom-[15%] right-[10%] w-[500px] h-[500px] rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-[130px]" />

        {/* Ambient Chat Bubble: Top-Left */}
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden md:flex absolute top-14 left-10 lg:left-24 items-center gap-3 p-3.5 rounded-2xl rounded-bl-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#121522]/40 backdrop-blur-md shadow-lg max-w-xs opacity-75"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            Y
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-200">Yash</div>
            <div className="text-slate-500 dark:text-slate-400">Welcome back to your conversations! ⚡</div>
          </div>
        </motion.div>

        {/* Ambient Chat Bubble: Top-Right */}
        <motion.div
          animate={{ y: [0, 12, 0], x: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="hidden md:flex absolute top-20 right-10 lg:right-28 items-center gap-2.5 p-3 rounded-2xl rounded-br-sm border border-violet-500/30 bg-violet-600/10 dark:bg-violet-950/30 backdrop-blur-md shadow-lg opacity-70"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">
            Encrypted Session Active
          </span>
        </motion.div>

        {/* Ambient Chat Bubble: Middle-Left */}
        <motion.div
          animate={{ y: [0, 10, 0], x: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-8 xl:left-20 items-center gap-3 p-3.5 rounded-2xl rounded-tl-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#121522]/40 backdrop-blur-md shadow-lg max-w-xs opacity-65"
        >
          <div className="w-7 h-7 rounded-xl bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0">
            <MessageSquare size={14} />
          </div>
          <div className="text-xs">
            <div className="text-slate-500 dark:text-slate-400">Your people. Your space.</div>
            <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
              <CheckCheck size={12} /> Always in sync
            </div>
          </div>
        </motion.div>

        {/* Ambient Chat Bubble: Middle-Right */}
        <motion.div
          animate={{ y: [0, -12, 0], x: [0, -8, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 right-8 xl:right-20 items-center gap-2 px-4 py-2.5 rounded-2xl rounded-tr-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-[#121522]/50 backdrop-blur-md shadow-lg opacity-70"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">online</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </motion.div>

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* ======================================================== */}
      {/* CENTERED LOGIN CARD                                      */}
      {/* ======================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md my-auto rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-[#10131d]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="md" showTagline={false} className="mb-2" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sign in to continue to your conversations.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email or Username
            </label>
            <div className="relative">
              <UserCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="username or user@example.com"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0a0d16] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0a0d16] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to SHADO</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Create one now
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121520] shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Reset Password</h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your account email and we'll dispatch instructions to reset your password.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0e16] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all cursor-pointer"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
