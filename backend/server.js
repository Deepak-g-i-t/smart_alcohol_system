/**
 * SLMRS Backend Server — Production Grade
 * Express REST API + Socket.io + node-cron + Winston + MySQL + MongoDB
 */

require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectMySQL, getPool } = require('./config/mysql');
const { connectMongo }          = require('./config/mongo');
const logger                    = require('./utils/logger');
const { startCronJobs }         = require('./jobs/quotaReset');
const { initSocketIO }          = require('./sockets/index');

/* ─── Startup environment validation ─────────────────────── */
const REQUIRED_ENV = [
  'JWT_SECRET', 'MYSQL_HOST', 'MYSQL_USER',
  'MYSQL_PASSWORD', 'MYSQL_DB', 'MONGO_URI',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required env var: ${key}`);
    process.exit(1);
  }
}
if (
  process.env.JWT_SECRET === 'supersecret_jwt_key_xyz_development' &&
  process.env.NODE_ENV === 'production'
) {
  console.error('[FATAL] Default JWT_SECRET in production — aborting');
  process.exit(1);
}

/* ─── Routes ─────────────────────────────────────────────── */
const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const policyRoutes      = require('./routes/policies');
const analyticsRoutes   = require('./routes/analytics');
const inventoryRoutes   = require('./routes/inventory');
const reportsRoutes     = require('./routes/reports');
const buyersRoutes      = require('./routes/buyers');  // NEW

/* ─── App + HTTP server ──────────────────────────────────── */
const app    = express();
const server = http.createServer(app);

/* ─── CORS ───────────────────────────────────────────────── */
const allowedOrigins = (
  process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost'
).split(',');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

/* ─── Security + parsing ─────────────────────────────────── */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

/* ─── Global rate limit ──────────────────────────────────── */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

/* ─── Socket.io (Task 6) ─────────────────────────────────── */
const io = initSocketIO(server);
app.set('io', io);

/* ─── DB + Cron ──────────────────────────────────────────── */
connectMySQL().then(() => {
  logger.info('[MySQL] Connected');
  startCronJobs();
}).catch((err) => {
  logger.error('[MySQL] Connection failed', { message: err.message });
});

connectMongo();

/* ─── API routes ─────────────────────────────────────────── */
app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/policies',     policyRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/inventory',    inventoryRoutes);
app.use('/api/reports',      reportsRoutes);
app.use('/api/buyers',       buyersRoutes);  // NEW

/* ─── Health check ───────────────────────────────────────── */
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
  };

  try {
    await getPool().query('SELECT 1');
    health.mysql = 'ok';
  } catch {
    health.mysql  = 'error';
    health.status = 'degraded';
  }

  try {
    const mongoose = require('mongoose');
    health.mongo = mongoose.connection.readyState === 1 ? 'ok' : 'disconnected';
    if (health.mongo !== 'ok') health.status = 'degraded';
  } catch {
    health.mongo  = 'error';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

/* ─── Centralized error handler ──────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    path:    req.path,
    method:  req.method,
  });
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

/* ─── Start ───────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 SLMRS running on :${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = { app, io };
