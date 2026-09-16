// MatrixTechX - WhatsApp Bulk Messenger
// Main Express Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const dirs = [
    path.join(__dirname, 'database'),
    path.join(__dirname, 'public'),
    path.join(__dirname, 'uploads')
];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const { initializeDatabase } = require('./src/database/db');
initializeDatabase();

// ===== MIDDLEWARE =====
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Raw body for webhook (must be before json parser)
app.use('/api/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    if (req.body) {
        try {
            req.body = JSON.parse(req.body.toString());
        } catch (e) {
            // ignore parse error, let route handle it
        }
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ===== API ROUTES =====
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/contacts', require('./src/routes/contacts'));
app.use('/api/groups', require('./src/routes/groups'));
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/campaigns', require('./src/routes/campaigns'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/team', require('./src/routes/team'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/webhook', require('./src/routes/webhook'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MatrixTechX WhatsApp Platform is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Catch-all: serve frontend for all non-API routes
app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║    🚀 MatrixTechX WhatsApp Platform            ║');
    console.log('║    WhatsApp Bulk Messenger v1.0.0               ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 Webhook URL: http://your-domain.com/api/webhook`);
    console.log(`🔑 Admin: ${process.env.ADMIN_EMAIL || 'admin@matrixtechx.com'}`);
    console.log(`🔐 Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    console.log('');
});

module.exports = app;
