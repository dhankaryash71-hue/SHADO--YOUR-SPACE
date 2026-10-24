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

let retryCount = 0;

const startServer = () => {
  server.removeAllListeners('error');

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (retryCount < 2) {
        retryCount++;
        console.warn(`\n⚠️  [SHADO] Port ${PORT} is occupied by an existing process.`);
        console.warn(`   Automatically clearing lingering process and retrying in 1s (attempt ${retryCount}/2)...`);
        killPort(PORT);
        setTimeout(() => {
          startServer();
        }, 1000);
      } else {
        console.error(`\n❌ [SHADO Error] Port ${PORT} is still in use after retrying.`);
        console.error(`💡 Run 'npm run clean:port' to immediately free port ${PORT}.\n`);
        process.exit(1);
      }
    } else {
      console.error('[SHADO Server Error]:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  SHADO Backend Server running on port ${PORT}`);
    console.log(`  Real-Time Socket.IO initialized`);
    console.log(`  Disappearing Messages worker active`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`===============================================`);
  });
};

startServer();

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down SHADO server gracefully...');
  stopExpirationWorker();
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
