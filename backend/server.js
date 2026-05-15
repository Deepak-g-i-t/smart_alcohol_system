/**
 * SLMRS Backend Server
 * Features: Express REST API, Socket.io real-time events, node-cron quota reset,
 *           Winston logging, JWT auth, RBAC, MySQL + MongoDB dual-DB
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server: SocketIOServer } = require('socket.io');
const jwt = require('jsonwebtoken');

const { connectMySQL, getPool } = require('./config/mysql');
const { connectMongo } = require('./config/mongo');
const logger = require('./utils/logger');
const { startCronJobs } = require('./jobs/quotaReset');

/* ─── Startup environment validation ─────────────────────── */
const REQUIRED_ENV = ['JWT_SECRET', 'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DB', 'MONGO_URI'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET === 'supersecret_jwt_key_999' && process.env.NODE_ENV === 'production') {
  logger.error('FATAL: JWT_SECRET is default value — set a strong secret in production!');
  process.exit(1);
}

/* ─── Routes ─────────────────────────────────────────────── */
const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const policyRoutes      = require('./routes/policies');
const analyticsRoutes   = require('./routes/analytics');
const inventoryRoutes   = require('./routes/inventory');
const reportsRoutes     = require('./routes/reports');

/* ─── App + HTTP server ──────────────────────────────────── */
const app    = express();
const server = http.createServer(app);

/* ─── CORS (Priority 4.4 hardening) ─────────────────────── */
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

/* ─── Security middleware ────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: false, // handled by nginx in production
}));
app.use(express.json({ limit: '1mb' }));

/* ─── Global rate limit ──────────────────────────────────── */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
}));

/* ─── Socket.io (Priority 2.4) ──────────────────────────── */
const io = new SocketIOServer(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

// Socket.io JWT auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('No token provided'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.debug(`[Socket.io] Client connected: ${socket.id} role=${socket.user?.role}`);
  socket.join(`role:${socket.user?.role}`);
  socket.on('disconnect', () => {
    logger.debug(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Attach io to app so controllers can emit events
app.set('io', io);

/* ─── DB + Cron startup ──────────────────────────────────── */
connectMySQL().then(() => startCronJobs());
connectMongo();

/* ─── API routes ─────────────────────────────────────────── */
app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/policies',     policyRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/inventory',    inventoryRoutes);
app.use('/api/reports',      reportsRoutes);

/* ─── Health check (Priority 5.2) ───────────────────────── */
app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };

  // MySQL ping
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    health.mysql = 'ok';
  } catch {
    health.mysql = 'error';
    health.status = 'degraded';
  }

  // MongoDB ping
  try {
    const { connection } = require('mongoose');
    health.mongo = connection.readyState === 1 ? 'ok' : 'disconnected';
    if (health.mongo !== 'ok') health.status = 'degraded';
  } catch {
    health.mongo = 'error';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

/* ─── Centralized error handler ──────────────────────────── */
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

/* ─── Start ───────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 SLMRS Backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = { app, io };
