const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectMySQL } = require('./config/mysql');
const { connectMongo } = require('./config/mongo');

// Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const policyRoutes = require('./routes/policies');
const analyticsRoutes = require('./routes/analytics');

const app = express();


// Connecting to Databases
connectMySQL();
connectMongo();
        

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic Rate Limit
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/analytics', analyticsRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
