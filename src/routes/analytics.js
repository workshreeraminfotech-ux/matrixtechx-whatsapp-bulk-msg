// MatrixTechX - Analytics Routes
const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/analytics/dashboard
router.get('/dashboard', (req, res) => {
    const db = getDB();

    const stats = db.prepare(`
        SELECT
            (SELECT COUNT(*) FROM contacts WHERE status = 'ACTIVE') as total_contacts,
            (SELECT COUNT(*) FROM campaigns) as total_campaigns,
            (SELECT COUNT(*) FROM templates) as total_templates,
            (SELECT COALESCE(SUM(sent), 0) FROM campaigns) as total_sent,
            (SELECT COALESCE(SUM(delivered), 0) FROM campaigns) as total_delivered,
            (SELECT COALESCE(SUM(read), 0) FROM campaigns) as total_read,
            (SELECT COALESCE(SUM(failed), 0) FROM campaigns) as total_failed,
            (SELECT COUNT(*) FROM campaigns WHERE date(started_at) = date('now')) as today_campaigns
    `).get();

    // Delivery rate
    stats.delivery_rate = stats.total_sent > 0
        ? Math.round((stats.total_delivered / stats.total_sent) * 100)
        : 0;
    stats.read_rate = stats.total_sent > 0
        ? Math.round((stats.total_read / stats.total_sent) * 100)
        : 0;

    // Contact growth (this week vs last week)
    const contactGrowth = db.prepare(`
        SELECT
            SUM(CASE WHEN created_at >= date('now', '-7 days') THEN 1 ELSE 0 END) as this_week,
            SUM(CASE WHEN created_at >= date('now', '-14 days') AND created_at < date('now', '-7 days') THEN 1 ELSE 0 END) as last_week
        FROM contacts
    `).get();
    stats.contact_growth_this_week = contactGrowth.this_week || 0;
    stats.contact_growth_last_week = contactGrowth.last_week || 0;

    // Monthly growth (messages this month vs last month)
    const msgGrowth = db.prepare(`
        SELECT
            SUM(CASE WHEN strftime('%Y-%m', started_at) = strftime('%Y-%m', 'now') THEN sent ELSE 0 END) as this_month,
            SUM(CASE WHEN strftime('%Y-%m', started_at) = strftime('%Y-%m', date('now', '-1 month')) THEN sent ELSE 0 END) as last_month
        FROM campaigns
    `).get();
    stats.this_month_sent = msgGrowth.this_month || 0;
    stats.last_month_sent = msgGrowth.last_month || 0;

    res.json({ success: true, data: stats });
});

// GET /api/analytics/campaigns - Campaign performance over time
router.get('/campaigns', (req, res) => {
    const db = getDB();
    const { days = 30 } = req.query;

    const data = db.prepare(`
        SELECT
            date(created_at) as date,
            COUNT(*) as campaigns,
            SUM(sent) as sent,
            SUM(delivered) as delivered,
            SUM(read) as read,
            SUM(failed) as failed
        FROM campaigns
        WHERE created_at >= date('now', '-' || ? || ' days')
        GROUP BY date(created_at)
        ORDER BY date
    `).all(parseInt(days));

    res.json({ success: true, data });
});

// GET /api/analytics/contacts - Contact growth over time
router.get('/contacts', (req, res) => {
    const db = getDB();
    const { days = 30 } = req.query;

    const data = db.prepare(`
        SELECT
            date(created_at) as date,
            COUNT(*) as new_contacts
        FROM contacts
        WHERE created_at >= date('now', '-' || ? || ' days')
        GROUP BY date(created_at)
        ORDER BY date
    `).all(parseInt(days));

    res.json({ success: true, data });
});

// GET /api/analytics/message-status
router.get('/message-status', (req, res) => {
    const db = getDB();

    const data = db.prepare(`
        SELECT
            SUM(sent) as sent,
            SUM(delivered) as delivered,
            SUM(read) as read,
            SUM(failed) as failed
        FROM campaigns
    `).get();

    res.json({ success: true, data });
});

module.exports = router;
