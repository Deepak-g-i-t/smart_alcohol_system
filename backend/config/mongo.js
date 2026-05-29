const mongoose = require('mongoose');

/**
 * connectMongo — non-fatal MongoDB connection.
 *
 * MongoDB is used only for AuditLog (non-critical). If it is
 * unavailable (auth failure, missing container, wrong credentials)
 * the backend MUST still start so MySQL-backed routes work.
 * All AuditLog.create() calls are already wrapped in try/catch.
 */
const connectMongo = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[MongoDB] MONGO_URI not set — audit logs disabled');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('[MongoDB] Connected — audit logs enabled');
  } catch (err) {
    // Non-fatal: log warning, DO NOT exit. MySQL routes still work.
    console.warn(
      '[MongoDB] Connection failed — audit logs disabled.',
      err.message,
      '\nFix: set correct MONGO_USER / MONGO_PASSWORD in .env and restart.'
    );
  }
};

// Keep retrying in the background so the app auto-heals if Mongo comes up later
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected — audit logs paused');
});
mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected — audit logs resumed');
});

module.exports = { connectMongo };
