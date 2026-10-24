# SHADO — Premium Real-Time Chat Application

> **"Your People. Your Space."**

SHADO is a production-grade, full-stack real-time messaging application designed with a minimal, mysterious, and modern aesthetic. Built with **React**, **Node.js**, **Express**, **Socket.IO**, **PostgreSQL**, and **Prisma ORM**.

---

## 🌟 Key Features

### 1. 🎬 Cinematic Opening Animation
- **Framer Motion Orchestration**: A seamless 3–4 second sequence beginning with a near-black canvas and ambient violet lighting, transitioning into an abstract shadow symbol, morphing into the geometric SHADO logo, and smoothly presenting the tagline.
- **Smart Session Awareness**: Plays in full on the first visit; cached via `localStorage` on subsequent visits.
- **Auto-Bypass**: Authenticated users bypass directly to the chat dashboard.
- **Accessibility**: Native `prefers-reduced-motion` detection and manual "Skip Intro" option.

### 2. 🛡️ Direct Registration & Authentication
- **Focused Registration Details**:
  - Centered glassmorphic card focusing strictly on user registration details without marketing hero distractions.
  - Ambient chats-related background with subtle floating message bubbles and electric violet/soft blue radial glows.
  - Real-time form validation: full name, unique username (with multiple-change support), email address, password with show/hide toggle, live password strength meter (Weak/Fair/Good/Strong), and confirmation matching.
- **Security**: Passwords hashed with `bcryptjs` (12 salt rounds), secure HTTP-only cookies (`shado_token`), Bearer token authorization fallback, and rate-limiting (`express-rate-limit`).
- **Zero Simulation**: 100% backed by real database records and transactions.

### 3. 🌗 Light, Dark & System Themes
- **Themes**: Dark Mode (deep charcoal `#08090d`, graphite cards `#141722`, electric violet `#8b5cf6`), Light Mode (soft white `#f8fafc`, pure white cards `#ffffff`, deep violet `#7c3aed`), and System Default.
- **Zero Flash**: Pre-hydration inline script prevents theme flicker on page refresh.
- Available across all screens (Registration, Login, Chat Dashboard, Settings).

### 4. 👥 User Search & Friend Requests
- **Debounced Search**: Live search with a 300ms debounce across usernames and display names.
- **Full Relationship Lifecycle**:
  - **Add Friend** → **Pending (Cancel)**
  - **Incoming Request** → **Accept** / **Decline**
  - **Mutual Match Auto-Acceptance**: If both users send requests to each other, they are automatically connected.
  - **Celebratory Confetti**: Canvas-confetti triggers on friend acceptance.
  - **Friend Removal & User Blocking**.

### 5. ⚡ Real-Time Private Messaging
- **Socket.IO Real-Time Engine**: Authenticated handshakes via JWT.
- **Active Presence**: Dynamic online/offline tracking with live pulsating green badges and broadcast events.
- **Typing Indicators**: Real-time "is typing..." feedback.
- **Database Persistence**: Every message is validated and persisted in PostgreSQL via Prisma before delivery confirmation.
- **Rich Message Composer**: Categorized emoji picker, keyboard shortcuts (Enter to send, Shift+Enter for new line), and delivery receipt checkmarks (sent vs delivered).
- **Web Audio Chimes**: Synthesized subtle chime for incoming notifications without external audio file dependencies.

### 6. ⚙️ User Settings & Profile Controls
- Customize Full Name, Bio, and Preset Avatar seeds (DiceBear).
- Change password with verification.
- Manage blocked users with 1-click unblock.
- Account deletion (Danger Zone).

---

## 🏗️ Architecture & Technology Stack

```
shado/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/         # Logo, Avatar, CinematicIntro, ThemeToggle, EmojiPicker, Modals
│   │   ├── context/            # AuthContext, ThemeContext, SocketContext, ToastContext
│   │   ├── pages/              # RegisterPage, LoginPage, ChatDashboardPage
│   │   ├── services/           # Axios API modules (auth, users, friends, conversations)
│   │   ├── App.jsx             # Route definitions & Intro controller
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Tailwind CSS v4 & custom design tokens
│   ├── index.html
│   ├── package.json
│   └── vite.config.js          # Vite config with @tailwindcss/vite & API proxy
│
├── server/                     # Backend API & Socket Server (Node.js + Express)
│   ├── prisma/
│   │   ├── schema.prisma       # PostgreSQL Database Schema (Production)
│   │   └── schema.sqlite.prisma# SQLite Schema (Zero-config local fallback)
│   ├── src/
│   │   ├── config/             # Prisma client singleton (db.js)
│   │   ├── controllers/        # Auth, User, Friend, Conversation, Notification
│   │   ├── middleware/         # JWT Auth, Rate Limiter, Error Handler
│   │   ├── routes/             # Express API Routers
│   │   ├── socket/             # Socket.IO Handlers & Presence Engine
│   │   ├── utils/              # Password hashing, JWT, Input validators
│   │   ├── scripts/            # Database init & E2E verification test suite
│   │   ├── app.js              # Express application setup & middleware
│   │   └── server.js           # HTTP + Socket.IO server entry point
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── package.json                # Root package orchestration
└── README.md
```

---

## 🗄️ Database Models (Prisma ORM)

| Model | Description |
|---|---|
| `User` | User profiles, credentials hash, avatar, bio, presence status, timestamps |
| `FriendRequest` | Friend requests with statuses: `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED` |
| `Conversation` | Supports `DIRECT` one-on-one chats and extensible `GROUP` chats |
| `ConversationMember`| Maps users to conversations, tracks `lastReadAt` for unread counts |
| `Message` | Text content, conversation reference, sender reference, delivery status |
| `Notification` | System and real-time in-app alerts (`FRIEND_REQUEST`, `FRIEND_ACCEPT`, `NEW_MESSAGE`) |
| `BlockedUser` | User-to-user blocking relationships for privacy |

---

## 🚀 Quick Start & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL** (or use the built-in zero-config SQLite development mode)

### 1. Installation
Clone the repository and install dependencies for both client and server:

```bash
# In the project root:
npm run install:all
```

Or install individually:
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Environment Configuration
Create `.env` inside `server/`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=shado_super_secret_jwt_key_ultra_secure_change_in_production_2026
JWT_EXPIRES_IN=7d

# Option A: Zero-config local development (SQLite):
DATABASE_URL="file:./dev.db"

# Option B: PostgreSQL (Local or Cloud like Neon / Supabase):
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shado_db?schema=public"
```

### 3. Initialize Database
Generate Prisma Client and push the schema:

```bash
npm run db:setup
```

### 4. Run Development Servers
Start both backend and frontend concurrently:

```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Frontend Client (Port 5173)
npm run dev:client
```

Open your browser to:
```
http://localhost:5173
```

---

## 🧪 Automated End-to-End Test Suite

A complete verification test suite is included in `server/src/scripts/testE2E.js`. It executes:
1. Registration of User 1 (Yash).
2. Registration of User 2 (Priya).
3. Search query with relation state matching.
4. Sending friend request.
5. Notification reception.
6. Acceptance of friend request & mutual list updates.
7. Auto-creation of private conversation.
8. Real-time message exchange and database persistence.

To execute tests:
```bash
cd server
node src/scripts/testE2E.js
```

---

## 🚢 Deployment Guide

### Deploying the Backend (Render, Railway, Fly.io, or VPS)
1. Set the following environment variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `CLIENT_URL=https://your-shado-client.vercel.app`
   - `JWT_SECRET=<strong-random-secret>`
   - `DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require`
2. Run database migration:
   ```bash
   npx prisma migrate deploy
   ```
3. Start the server:
   ```bash
   npm start
   ```

### Deploying the Frontend (Vercel, Netlify, Cloudflare Pages)
1. Set root directory to `client`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variables:
   - `VITE_API_URL=https://your-shado-api.onrender.com/api`
   - `VITE_SOCKET_URL=https://your-shado-api.onrender.com`

---

## 🔒 Security Best Practices Implemented
- **Password Protection**: Passwords salted and hashed with `bcryptjs`. Plaintext passwords never stored or logged.
- **HTTP-Only Cookies**: Secure auth cookies prevent XSS token theft.
- **Handshake Verification**: Socket.IO authenticates tokens before allowing connections or room joins.
- **Authorization Guarding**: Conversation membership is strictly validated on the database level before any message is accepted or delivered.
- **Sanitized Errors**: Internal stack traces are suppressed in production.
- **Rate Limiting**: Protects sensitive endpoints against brute-force attempts.

---

## 📄 License
MIT License. Built with passion for modern real-time architecture.
#   S H A D O - - Y O U R - S P A C E  
 