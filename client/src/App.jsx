import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ChatDashboardPage from './pages/ChatDashboardPage';
import IntroAnimation from './components/IntroAnimation';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#07080c] text-white">
        <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/register" replace />;
  }

  return children;
};

// Root App Controller handling the Cinematic First-Visit Intro
const AppContent = () => {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState(() => {
    // Only show full cinematic intro if user hasn't seen it yet
    const hasSeen = localStorage.getItem('shado_has_seen_intro');
    return !hasSeen;
  });

  const handleIntroComplete = () => {
    localStorage.setItem('shado_has_seen_intro', 'true');
    setShowIntro(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#07080c] text-white">
        <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show 3-second Intro Animation on first visit (only if not already authenticated)
  if (showIntro && !user) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/chat" replace /> : <Navigate to="/register" replace />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/chat" replace /> : <RegisterPage />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/chat" replace /> : <LoginPage />}
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
