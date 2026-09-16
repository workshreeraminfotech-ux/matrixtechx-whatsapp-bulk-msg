// MatrixTechX - Templates Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { syncTemplatesFromWhatsApp, createWhatsAppTemplate } = require('../services/whatsapp');

router.use(authenticateToken);

// GET /api/templates
router.get('/', (req, res) => {
    const db = getDB();
    const { search, category, status } = req.query;

    let query = 'SELECT * FROM templates WHERE 1=1';
    const params = [];

    if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (status) { query += ' AND status = ?'; params.push(status); }

    query += ' ORDER BY created_at DESC';
    const templates = db.prepare(query).all(...params);
    res.json({ success: true, data: templates });
});

// GET /api/templates/:id
router.get('/:id', (req, res) => {
    const db = getDB();
    const template = db.prepare('SELECT * FROM templates WHERE uuid = ?').get(req.params.id);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
});

// POST /api/templates
router.post('/', async (req, res) => {
    const { name, category, language, template_type, header_type, header_content, body, footer, buttons, channelId } = req.body;

    if (!name || !body) {
        return res.status(400).json({ success: false, error: 'Template name and body are required' });
    }

    const db = getDB();

    // Try to create in WhatsApp API
    let waStatus = 'PENDING';
    let waTemplateId = null;
    const waResult = await createWhatsAppTemplate({ name, category, language, header_type, header_content, body, footer, buttons: JSON.stringify(buttons || []) }, channelId);
    if (waResult.success) {
        waStatus = waResult.status || 'PENDING';
        waTemplateId = waResult.templateId;
    }

    const id = db.prepare(`
        INSERT INTO templates (uuid, name, category, language, template_type, header_type, header_content, body, footer, buttons, status, whatsapp_template_id, channel_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(), name, category || 'MARKETING', language || 'en_US',
        template_type || 'CUSTOM', header_type || null, header_content || null,
        body, footer || null, JSON.stringify(buttons || []),
        waStatus, waTemplateId, channelId || 1, req.user.id
    ).lastInsertRowid;

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    res.status(201).json({
        success: true,
        data: template,
        whatsapp: waResult
    });
});

// PUT /api/templates/:id
router.put('/:id', (req, res) => {
    const db = getDB();
    const template = db.prepare('SELECT * FROM templates WHERE uuid = ?').get(req.params.id);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    const { name, body, footer, buttons, status } = req.body;
    db.prepare(`
        UPDATE templates SET name = ?, body = ?, footer = ?, buttons = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(name || template.name, body || template.body, footer || template.footer,
          JSON.stringify(buttons || JSON.parse(template.buttons || '[]')),
          status || template.status, template.id);

    res.json({ success: true, data: db.prepare('SELECT * FROM templates WHERE id = ?').get(template.id) });
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
    const db = getDB();
    const template = db.prepare('SELECT id FROM templates WHERE uuid = ?').get(req.params.id);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    db.prepare('DELETE FROM templates WHERE id = ?').run(template.id);
    res.json({ success: true, message: 'Template deleted' });
});

// POST /api/templates/sync - Sync from WhatsApp API
router.post('/sync', async (req, res) => {
    const { channelId } = req.body;
    const result = await syncTemplatesFromWhatsApp(channelId);

    if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
    }

    const db = getDB();
    let synced = 0;
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO templates (uuid, name, category, language, body, status, whatsapp_template_id, channel_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of result.templates) {
        const existing = db.prepare('SELECT uuid FROM templates WHERE whatsapp_template_id = ?').get(t.id);
        const bodyComp = t.components?.find(c => c.type === 'BODY');
        stmt.run(
            existing?.uuid || uuidv4(),
            t.name, t.category, t.language,
            bodyComp?.text || '',
            t.status, t.id, channelId || 1, req.user.id
        );
        synced++;
    }

    res.json({ success: true, synced, total: result.templates.length });
});

module.exports = router;
