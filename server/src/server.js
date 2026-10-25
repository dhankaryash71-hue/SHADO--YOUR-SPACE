import http from 'http';
import app from './app.js';
import { initSocket } from './socket/index.js';
import prisma from './config/db.js';
import { killPort } from './scripts/cleanPort.js';
import { startExpirationWorker, stopExpirationWorker } from './services/expirationService.js';

const PORT = Number(process.env.PORT) || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server, process.env.CLIENT_URL);

// Start automatic message expiration cleanup worker
startExpirationWorker(10000);

// Reset stale online statuses from previous process lifecycles
prisma.user
  .updateMany({
    where: { isOnline: true },
    data: { isOnline: false },
  })
  .catch(console.error);

// Clear any existing process on port before listening
killPort(PORT);

server.on('error', (err) => {
  console.error('[SHADO Server Error]:', err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  SHADO Backend Server running on port ${PORT}`);
  console.log(`  Real-Time Socket.IO initialized`);
  console.log(`  Disappearing Messages worker active`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down SHADO server gracefully...');
  stopExpirationWorker();
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (_) {}
    console.log('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.once('SIGUSR2', () => {
  stopExpirationWorker();
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

