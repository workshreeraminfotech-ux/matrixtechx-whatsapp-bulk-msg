// MatrixTechX - Team & Inbox Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { sendTextMessage, sendTemplateMessage } = require('../services/whatsapp');

router.use(authenticateToken);

// ========== TEAM MEMBERS ==========

// GET /api/team
router.get('/', (req, res) => {
    const db = getDB();
    const users = db.prepare('SELECT id, uuid, name, email, username, role, is_active, created_at FROM users ORDER BY name').all();
    res.json({ success: true, data: users });
});

// POST /api/team - Add team member
router.post('/', (req, res) => {
    const { firstName, lastName, username, email, password, permissions } = req.body;

    if (!firstName || !email || !password) {
        return res.status(400).json({ success: false, error: 'First name, email, and password are required' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ success: false, error: 'Email already exists' });

    const hashedPwd = bcrypt.hashSync(password, 10);
    const fullName = `${firstName} ${lastName || ''}`.trim();

    const id = db.prepare(`
        INSERT INTO users (uuid, name, email, username, password, role,
            perm_manage_contacts, perm_manage_campaigns, perm_manage_templates,
            perm_view_analytics, perm_manage_team, perm_manage_inbox,
            perm_manage_settings, perm_manage_automations, perm_general_settings,
            perm_manage_widgets, perm_manage_support)
        VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(), fullName, email, username || null, hashedPwd,
        permissions?.manage_contacts ? 1 : 0,
        permissions?.manage_campaigns ? 1 : 0,
        permissions?.manage_templates ? 1 : 0,
        permissions?.view_analytics ? 1 : 0,
        permissions?.manage_team ? 1 : 0,
        permissions?.manage_inbox ? 1 : 0,
        permissions?.manage_settings ? 1 : 0,
        permissions?.manage_automations ? 1 : 0,
        permissions?.general_settings ? 1 : 0,
        permissions?.manage_widgets ? 1 : 0,
        permissions?.manage_support ? 1 : 0
    ).lastInsertRowid;

    const user = db.prepare('SELECT id, uuid, name, email, role, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: user });
});

// DELETE /api/team/:id
router.delete('/:id', (req, res) => {
    const db = getDB();
    const user = db.prepare('SELECT id FROM users WHERE uuid = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Team member not found' });
    if (user.id === req.user.id) return res.status(400).json({ success: false, error: 'Cannot delete yourself' });

    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(user.id);
    res.json({ success: true, message: 'Team member removed' });
});

// ========== CONVERSATIONS & INBOX ==========

// GET /api/team/conversations
router.get('/conversations', (req, res) => {
    const db = getDB();
    const { tab = 'all', search } = req.query;

    let query = `
        SELECT cv.*, c.name as contact_name, c.phone as contact_phone, c.avatar
        FROM conversations cv
        JOIN contacts c ON cv.contact_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (tab === 'assigned') {
        query += ' AND cv.assigned_to = ?'; params.push(req.user.id);
    } else if (tab === 'unread') {
        query += ' AND cv.unread_count > 0';
    }
    if (search) {
        query += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY cv.is_pinned DESC, cv.last_message_at DESC LIMIT 50';
    const conversations = db.prepare(query).all(...params);

    res.json({ success: true, data: conversations });
});

// GET /api/team/conversations/:id/messages
router.get('/conversations/:id/messages', (req, res) => {
    const db = getDB();
    const conv = db.prepare('SELECT * FROM conversations WHERE uuid = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

    const messages = db.prepare(`
        SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `).all(conv.id);

    // Mark as read
    db.prepare('UPDATE conversations SET unread_count = 0 WHERE id = ?').run(conv.id);

    res.json({ success: true, data: messages, conversation: conv });
});

// POST /api/team/conversations/:id/send - Send message from inbox
router.post('/conversations/:id/send', async (req, res) => {
    const { content, type = 'text', templateId, templateComponents } = req.body;
    const db = getDB();

    const conv = db.prepare(`
        SELECT cv.*, c.phone FROM conversations cv JOIN contacts c ON cv.contact_id = c.id WHERE cv.uuid = ?
    `).get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

    let waResult;
    if (type === 'template' && templateId) {
        const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
        waResult = await sendTemplateMessage(conv.phone, template.name, template.language, templateComponents || [], conv.channel_id);
    } else {
        waResult = await sendTextMessage(conv.phone, content, conv.channel_id);
    }

    if (!waResult.success) {
        return res.status(400).json({ success: false, error: waResult.error });
    }

    // Save message to DB
    const msgId = db.prepare(`
        INSERT INTO messages (uuid, conversation_id, contact_id, channel_id, direction, message_type, content, whatsapp_message_id, status)
        VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, 'sent')
    `).run(uuidv4(), conv.id, conv.contact_id, conv.channel_id, type, content || `[Template: ${templateId}]`, waResult.messageId).lastInsertRowid;

    // Update conversation
    db.prepare(`
        UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(content || '[Template Message]', conv.id);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    res.json({ success: true, data: message });
});

module.exports = router;
