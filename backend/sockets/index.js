/**
 * Socket.io setup (Task 6)
 * Exports: initSocketIO(server) → returns io instance
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const initSocketIO = (server) => {
  const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000'
  ).split(',');

  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  /* ─── JWT auth middleware ────────────────────────────────── */
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) return next(new Error('Authentication error: no token'));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  /* ─── Connection handler ─────────────────────────────────── */
  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user || {};
    logger.info(`[Socket.io] Connected: ${socket.id} | user=${userId} role=${role}`);

    // Each user joins their role room — authority, shop, buyer
    socket.join(`role:${role}`);
    // Also join personal room (for targeted notifications)
    socket.join(`user:${userId}`);

    socket.on('disconnect', (reason) => {
      logger.debug(`[Socket.io] Disconnected: ${socket.id} reason=${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`[Socket.io] Socket error for ${socket.id}: ${err.message}`);
    });
  });

  logger.info('[Socket.io] Server initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized — call initSocketIO first');
  return io;
};

module.exports = { initSocketIO, getIO };
