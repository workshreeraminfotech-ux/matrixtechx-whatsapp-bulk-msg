// MatrixTechX - Vercel Serverless API Handler
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Raw body for webhook
app.use('/api/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    if (req.body) {
        try {
            req.body = JSON.parse(req.body.toString());
        } catch (e) {
            // ignore
        }
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database
try {
    const { initializeDatabase } = require('../src/database/db');
    initializeDatabase();
} catch (e) {
    console.warn('DB initialization notice:', e.message);
}

// API Routes
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/contacts', require('../src/routes/contacts'));
app.use('/api/groups', require('../src/routes/groups'));
app.use('/api/templates', require('../src/routes/templates'));
app.use('/api/campaigns', require('../src/routes/campaigns'));
app.use('/api/analytics', require('../src/routes/analytics'));
app.use('/api/team', require('../src/routes/team'));
app.use('/api/settings', require('../src/routes/settings'));
app.use('/api/webhook', require('../src/routes/webhook'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MatrixTechX WhatsApp Platform API is running on Vercel',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// 404 for unknown API endpoints
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Export serverless handler
module.exports = (req, res) => {
    return app(req, res);
};
