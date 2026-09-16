// MatrixTechX - WhatsApp Webhook Handler
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');

// GET /api/webhook - Webhook verification (Meta requirement)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook verified by Meta');
        return res.status(200).send(challenge);
    }
    res.status(403).send('Forbidden');
});

// POST /api/webhook - Receive WhatsApp messages & status updates
router.post('/', (req, res) => {
    // Always respond 200 quickly to WhatsApp
    res.status(200).send('OK');

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const db = getDB();

    for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
            const value = change.value;
            if (!value) continue;

            // Handle incoming messages
            for (const message of value.messages || []) {
                processIncomingMessage(db, message, value);
            }

            // Handle status updates
            for (const status of value.statuses || []) {
                processStatusUpdate(db, status);
            }
        }
    }
});

function processIncomingMessage(db, message, value) {
    try {
        const phoneNumber = message.from;
        const waMessageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

        // Find or create contact
        let contact = db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phoneNumber);
        if (!contact) {
            const profileName = value.contacts?.[0]?.profile?.name || phoneNumber;
            const contactId = db.prepare(`
                INSERT INTO contacts (uuid, name, phone, source, status)
                VALUES (?, ?, ?, 'whatsapp', 'ACTIVE')
            `).run(uuidv4(), profileName, phoneNumber).lastInsertRowid;
            contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
        }

        // Find or create conversation
        let conversation = db.prepare('SELECT * FROM conversations WHERE contact_id = ?').get(contact.id);
        if (!conversation) {
            const convId = db.prepare(`
                INSERT INTO conversations (uuid, contact_id, channel_id, status, source, last_message_at)
                VALUES (?, ?, 1, 'open', 'whatsapp', CURRENT_TIMESTAMP)
            `).run(uuidv4(), contact.id).lastInsertRowid;
            conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
        }

        // Extract message content
        let content = '';
        let messageType = message.type;
        let mediaUrl = null;
        let caption = null;

        switch (message.type) {
            case 'text':
                content = message.text?.body || '';
                break;
            case 'image':
                mediaUrl = message.image?.id;
                caption = message.image?.caption;
                content = '[Image]';
                break;
            case 'video':
                content = '[Video]';
                mediaUrl = message.video?.id;
                break;
            case 'audio':
                content = '[Audio]';
                mediaUrl = message.audio?.id;
                break;
            case 'document':
                content = `[Document: ${message.document?.filename || 'file'}]`;
                mediaUrl = message.document?.id;
                break;
            case 'button':
                content = message.button?.text || '[Button Reply]';
                break;
            default:
                content = `[${message.type}]`;
        }

        // Save message
        db.prepare(`
            INSERT OR IGNORE INTO messages (uuid, conversation_id, contact_id, channel_id, direction, message_type, content, media_url, caption, whatsapp_message_id, status, created_at)
            VALUES (?, ?, ?, 1, 'inbound', ?, ?, ?, ?, ?, 'received', ?)
        `).run(uuidv4(), conversation.id, contact.id, messageType, content, mediaUrl, caption, waMessageId, timestamp);

        // Update conversation
        db.prepare(`
            UPDATE conversations
            SET last_message = ?, last_message_at = ?, unread_count = unread_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(content, timestamp, conversation.id);

        // Update contact last_contact
        db.prepare('UPDATE contacts SET last_contact = CURRENT_TIMESTAMP WHERE id = ?').run(contact.id);

        console.log(`📩 Message from ${phoneNumber}: ${content}`);
    } catch (err) {
        console.error('Error processing incoming message:', err);
    }
}

function processStatusUpdate(db, status) {
    try {
        const waMessageId = status.id;
        const newStatus = status.status; // sent, delivered, read, failed

        // Update campaign recipient status
        const recipient = db.prepare('SELECT * FROM campaign_recipients WHERE whatsapp_message_id = ?').get(waMessageId);
        if (recipient) {
            let updateFields = `status = '${newStatus}'`;
            if (newStatus === 'delivered') updateFields += ', delivered_at = CURRENT_TIMESTAMP';
            if (newStatus === 'read') updateFields += ', read_at = CURRENT_TIMESTAMP';
            if (newStatus === 'failed') updateFields += ', failed_at = CURRENT_TIMESTAMP';

            db.prepare(`UPDATE campaign_recipients SET ${updateFields} WHERE id = ?`).run(recipient.id);

            // Update campaign aggregate stats
            if (newStatus === 'delivered') {
                db.prepare('UPDATE campaigns SET delivered = delivered + 1 WHERE id = ?').run(recipient.campaign_id);
            } else if (newStatus === 'read') {
                db.prepare('UPDATE campaigns SET read = read + 1 WHERE id = ?').run(recipient.campaign_id);
            }
        }

        // Update message status in inbox
        db.prepare('UPDATE messages SET status = ? WHERE whatsapp_message_id = ?').run(newStatus, waMessageId);

        console.log(`📊 Status update: ${waMessageId} -> ${newStatus}`);
    } catch (err) {
        console.error('Error processing status update:', err);
    }
}

module.exports = router;
