// MatrixTechX - Campaigns Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { executeCampaign } = require('../services/campaignSender');

router.use(authenticateToken);

// GET /api/campaigns
router.get('/', (req, res) => {
    const db = getDB();
    const campaigns = db.prepare(`
        SELECT c.*, t.name as template_name, u.name as created_by_name
        FROM campaigns c
        LEFT JOIN templates t ON c.template_id = t.id
        LEFT JOIN users u ON c.created_by = u.id
        ORDER BY c.created_at DESC
    `).all();

    // Summary stats
    const stats = db.prepare(`
        SELECT
            COUNT(*) as total_campaigns,
            SUM(total_recipients) as total_recipients,
            SUM(sent) as total_sent,
            SUM(delivered) as total_delivered,
            SUM(read) as total_read,
            SUM(failed) as total_failed,
            SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as active_campaigns
        FROM campaigns
    `).get();

    res.json({ success: true, data: campaigns, stats });
});

// GET /api/campaigns/:id
router.get('/:id', (req, res) => {
    const db = getDB();
    const campaign = db.prepare(`
        SELECT c.*, t.name as template_name, t.body as template_body, u.name as created_by_name
        FROM campaigns c
        LEFT JOIN templates t ON c.template_id = t.id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.uuid = ?
    `).get(req.params.id);

    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    // Get recipients breakdown
    const breakdown = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM campaign_recipients WHERE campaign_id = ?
        GROUP BY status
    `).all(campaign.id);

    res.json({ success: true, data: campaign, breakdown });
});

// POST /api/campaigns - Create & optionally start
router.post('/', async (req, res) => {
    const {
        name, template_id, channel_id, audience_type, group_id,
        contact_ids, scheduled_at, auto_retry, start_now
    } = req.body;

    if (!name || !template_id) {
        return res.status(400).json({ success: false, error: 'Campaign name and template are required' });
    }

    const db = getDB();

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    // Get recipient contacts
    let recipients = [];
    if (audience_type === 'group' && group_id) {
        recipients = db.prepare(`
            SELECT c.id, c.phone FROM contacts c
            JOIN contact_groups cg ON c.id = cg.contact_id
            WHERE cg.group_id = ? AND c.status = 'ACTIVE'
        `).all(group_id);
    } else if (audience_type === 'selected' && contact_ids?.length > 0) {
        const placeholders = contact_ids.map(() => '?').join(',');
        recipients = db.prepare(`SELECT id, phone FROM contacts WHERE id IN (${placeholders}) AND status = 'ACTIVE'`).all(...contact_ids);
    } else {
        recipients = db.prepare(`SELECT id, phone FROM contacts WHERE status = 'ACTIVE'`).all();
    }

    if (recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'No active contacts found for this campaign' });
    }

    // Create campaign
    const campaignId = db.prepare(`
        INSERT INTO campaigns (uuid, name, template_id, channel_id, audience_type, group_id,
            scheduled_at, auto_retry, total_recipients, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).run(
        uuidv4(), name, template_id, channel_id || 1,
        audience_type || 'all', group_id || null,
        scheduled_at || null, auto_retry ? 1 : 0,
        recipients.length, req.user.id
    ).lastInsertRowid;

    // Add recipients
    const recipientStmt = db.prepare(`
        INSERT INTO campaign_recipients (campaign_id, contact_id, status) VALUES (?, ?, 'pending')
    `);
    const addRecipients = db.transaction(() => {
        for (const r of recipients) recipientStmt.run(campaignId, r.id);
    });
    addRecipients();

    // Start immediately if requested (async)
    if (start_now && !scheduled_at) {
        setTimeout(() => executeCampaign(campaignId), 100);
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    res.status(201).json({ success: true, data: campaign, recipients: recipients.length });
});

// POST /api/campaigns/:id/start
router.post('/:id/start', async (req, res) => {
    const db = getDB();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE uuid = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    if (!['draft', 'paused'].includes(campaign.status)) {
        return res.status(400).json({ success: false, error: `Campaign is ${campaign.status}, cannot start` });
    }

    res.json({ success: true, message: 'Campaign started', campaignId: campaign.uuid });
    // Run async
    executeCampaign(campaign.id);
});

// POST /api/campaigns/:id/pause
router.post('/:id/pause', (req, res) => {
    const db = getDB();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE uuid = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    db.prepare(`UPDATE campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(campaign.id);
    res.json({ success: true, message: 'Campaign paused' });
});

// DELETE /api/campaigns/:id
router.delete('/:id', (req, res) => {
    const db = getDB();
    const campaign = db.prepare('SELECT id FROM campaigns WHERE uuid = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    db.prepare('DELETE FROM campaign_recipients WHERE campaign_id = ?').run(campaign.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaign.id);
    res.json({ success: true, message: 'Campaign deleted' });
});

module.exports = router;
