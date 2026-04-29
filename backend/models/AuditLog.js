const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    event_type: { type: String, required: true }, // login_attempt, policy_change, transaction_attempt
    user_id: { type: Number },
    user_role: { type: String },
    details: { type: Object },
    ip_address: { type: String },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
