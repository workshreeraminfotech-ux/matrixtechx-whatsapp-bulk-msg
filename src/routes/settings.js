// MatrixTechX - Settings Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/settings/channel
router.get('/channel', (req, res) => {
    const db = getDB();
    const channel = db.prepare('SELECT id, uuid, name, phone_number, phone_number_id, business_account_id, status FROM channels WHERE id = 1').get();
    res.json({ success: true, data: channel });
});

// PUT /api/settings/channel
router.put('/channel', (req, res) => {
    const { phone_number_id, access_token, business_account_id, webhook_verify_token } = req.body;
    const db = getDB();
    db.prepare(`
        UPDATE channels SET phone_number_id = ?, access_token = ?, business_account_id = ?,
        webhook_verify_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).run(phone_number_id, access_token, business_account_id, webhook_verify_token);
    res.json({ success: true, message: 'Channel settings updated' });
});

// GET /api/settings/notifications
router.get('/notifications', (req, res) => {
    const db = getDB();
    let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    if (!prefs) {
        db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(req.user.id);
        prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    }
    res.json({ success: true, data: prefs });
});

// PUT /api/settings/notifications
router.put('/notifications', (req, res) => {
    const db = getDB();
    db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(req.user.id);

    const fields = Object.keys(req.body).filter(k => k !== 'user_id').map(k => `${k} = ?`).join(', ');
    const values = Object.values(req.body);

    if (fields) {
        db.prepare(`UPDATE notification_preferences SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).run(...values, req.user.id);
    }
    res.json({ success: true, message: 'Notification preferences updated' });
});

// GET /api/settings/api-keys
router.get('/api-keys', (req, res) => {
    const db = getDB();
    const keys = db.prepare(`
        SELECT id, uuid, name, key_prefix, last_used, request_count, is_active, created_at
        FROM api_keys WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);

    const stats = {
        total_requests: keys.reduce((sum, k) => sum + k.request_count, 0),
        monthly_requests: 0, // TODO: monthly tracking
        active_keys: keys.filter(k => k.is_active).length,
        revoked_keys: keys.filter(k => !k.is_active).length
    };

    res.json({ success: true, data: keys, stats });
});

// POST /api/settings/api-keys
router.post('/api-keys', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'API key name is required' });

    const crypto = require('crypto');
    const rawKey = `mtx_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.substring(0, 12) + '...';
    const keyHash = require('bcryptjs').hashSync(rawKey, 8);
    const db = getDB();

    const id = db.prepare(`
        INSERT INTO api_keys (uuid, name, key_hash, key_prefix, user_id) VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), name, keyHash, prefix, req.user.id).lastInsertRowid;

    res.status(201).json({ success: true, data: { id, name, key: rawKey, prefix } });
});

// DELETE /api/settings/api-keys/:id - Revoke key
router.delete('/api-keys/:id', (req, res) => {
    const db = getDB();
    db.prepare('UPDATE api_keys SET is_active = 0, revoked_at = CURRENT_TIMESTAMP WHERE uuid = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true, message: 'API key revoked' });
});

// GET /api/settings/widget
router.get('/widget', (req, res) => {
    const db = getDB();
    let config = db.prepare('SELECT * FROM widget_configs WHERE channel_id = 1').get();
    if (!config) {
        db.prepare('INSERT INTO widget_configs (channel_id) VALUES (1)').run();
        config = db.prepare('SELECT * FROM widget_configs WHERE channel_id = 1').get();
    }
    res.json({ success: true, data: config });
});

// PUT /api/settings/widget
router.put('/widget', (req, res) => {
    const { title, subtitle, site_name, allowed_domain, chat_greeting, response_time, primary_color, accent_color, style_preset, position, logo_url } = req.body;
    const db = getDB();
    db.prepare(`
        UPDATE widget_configs SET title = ?, subtitle = ?, site_name = ?, allowed_domain = ?,
        chat_greeting = ?, response_time = ?, primary_color = ?, accent_color = ?,
        style_preset = ?, position = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE channel_id = 1
    `).run(title, subtitle, site_name, allowed_domain, chat_greeting, response_time, primary_color, accent_color, style_preset, position, logo_url);
    res.json({ success: true, message: 'Widget configuration saved' });
});

module.exports = router;
