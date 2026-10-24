import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  AtSign,
  ArrowRight,
  MessageSquare,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import PasswordStrength from '../components/PasswordStrength';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_-]{3,20}$/.test(formData.username.trim())) {
      newErrors.username = '3-20 characters: letters, numbers, _, -';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedTerms) {
      newErrors.terms = 'You must accept the terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register(formData);
      addToast('Welcome to SHADO! Your account has been created.', 'success');
      navigate('/chat');
    } catch (err) {
      const msg = err.response?.data?.message || err.friendlyMessage || err.message || 'Registration failed';
      addToast(msg, 'error');
      setErrors((prev) => ({ ...prev, form: msg }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#f8fafc] dark:bg-[#07080c] text-slate-800 dark:text-slate-100 overflow-x-hidden transition-colors select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-5 right-6 z-30 flex items-center gap-3">
        <ThemeToggle />
      </div>

      {/* ======================================================== */}
      {/* CHATS-RELATED AMBIENT BACKGROUND                         */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Ambient Radial Spotlights */}
        <div className="absolute -top-[15%] left-[8%] w-[520px] h-[520px] rounded-full bg-violet-600/15 dark:bg-violet-600/20 blur-[130px]" />
        <div className="absolute -bottom-[15%] right-[8%] w-[500px] h-[500px] rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-[130px]" />

        {/* Ambient Chat Bubble: Top-Left */}
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden md:flex absolute top-12 left-8 lg:left-20 items-center gap-3 p-3.5 rounded-2xl rounded-bl-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#121522]/40 backdrop-blur-md shadow-lg max-w-xs opacity-75"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            Y
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-200">Yash</div>
            <div className="text-slate-500 dark:text-slate-400">Hey! Let's connect on SHADO ⚡</div>
          </div>
        </motion.div>

        {/* Ambient Chat Bubble: Top-Right */}
        <motion.div
          animate={{ y: [0, 12, 0], x: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="hidden md:flex absolute top-16 right-8 lg:right-24 items-center gap-2.5 p-3 rounded-2xl rounded-br-sm border border-violet-500/30 bg-violet-600/10 dark:bg-violet-950/30 backdrop-blur-md shadow-lg opacity-70"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">
            Encrypted Space Active
          </span>
        </motion.div>

        {/* Ambient Chat Bubble: Middle-Left */}
        <motion.div
          animate={{ y: [0, 10, 0], x: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-6 xl:left-16 items-center gap-3 p-3.5 rounded-2xl rounded-tl-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#121522]/40 backdrop-blur-md shadow-lg max-w-xs opacity-65"
        >
          <div className="w-7 h-7 rounded-xl bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0">
            <MessageSquare size={14} />
          </div>
          <div className="text-xs">
            <div className="text-slate-500 dark:text-slate-400">Your people. Your space.</div>
            <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
              <CheckCheck size={12} /> Real-time instant sync
            </div>
          </div>
        </motion.div>

        {/* Ambient Chat Bubble: Middle-Right */}
        <motion.div
          animate={{ y: [0, -12, 0], x: [0, -8, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 right-6 xl:right-16 items-center gap-2 px-4 py-2.5 rounded-2xl rounded-tr-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-[#121522]/50 backdrop-blur-md shadow-lg opacity-70"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-fuchsia-600 to-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
            A
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Alex is typing<span className="animate-pulse">...</span>
          </div>
        </motion.div>

        {/* Ambient Chat Bubble: Bottom-Left */}
        <motion.div
          animate={{ y: [0, -8, 0], x: [0, -5, 0] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="hidden md:flex absolute bottom-12 left-10 lg:left-24 items-center gap-2 px-3.5 py-2 rounded-2xl rounded-bl-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#121522]/40 backdrop-blur-md shadow-lg opacity-60 text-xs text-slate-500"
        >
          <Sparkles size={13} className="text-violet-500" />
          <span>Zero-lag real-time messaging</span>
        </motion.div>

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* ======================================================== */}
      {/* CENTERED REGISTRATION CARD — PURE REGISTRATION DETAILS   */}
      {/* ======================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg my-auto rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-[#10131d]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <Logo size="md" showTagline={false} className="mb-2" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Create Your Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Join SHADO and connect with your people.
          </p>
        </div>

        {errors.form && (
          <div className="mb-4 p-3 rounded-2xl text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-500">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Row 1: Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="full name"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/70 dark:bg-[#0a0d16] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${
                    errors.fullName
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-violet-500'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-[11px] text-rose-500 mt-0.5">{errors.fullName}</p>}
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="username"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/70 dark:bg-[#0a0d16] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${
                    errors.username
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-violet-500'
                  }`}
                />
              </div>
              {errors.username && <p className="text-[11px] text-rose-500 mt-0.5">{errors.username}</p>}
            </div>
          </div>

          {/* Row 2: Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/70 dark:bg-[#0a0d16] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${
                  errors.email
                    ? 'border-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-violet-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-[11px] text-rose-500 mt-0.5">{errors.email}</p>}
          </div>

          {/* Row 3: Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full pl-9 pr-9 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/70 dark:bg-[#0a0d16] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${
                  errors.password
                    ? 'border-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-violet-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-rose-500 mt-0.5">{errors.password}</p>}
            <PasswordStrength password={formData.password} />
          </div>

          {/* Row 4: Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full pl-9 pr-9 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/70 dark:bg-[#0a0d16] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${
                  errors.confirmPassword
                    ? 'border-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-violet-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-rose-500 mt-0.5">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Row 5: Terms Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => {
                  setAgreedTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                }}
                className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="leading-tight">
                I accept the{' '}
                <span className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                  Privacy Policy
                </span>
                .
              </span>
            </label>
            {errors.terms && <p className="text-[11px] text-rose-500 mt-0.5">{errors.terms}</p>}
          </div>

          {/* Row 6: Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Create SHADO Account</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer: Already have an account */}
        <div className="text-center pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
