// MatrixTechX - Campaign Sender Service
const { getDB } = require('../database/db');
const { sendTemplateMessage } = require('./whatsapp');

// Delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Send campaign bulk messages
async function executeCampaign(campaignId) {
    const db = getDB();
    const campaign = db.prepare(`
        SELECT c.*, t.name as template_name, t.language as template_language, t.buttons as template_buttons
        FROM campaigns c
        LEFT JOIN templates t ON c.template_id = t.id
        WHERE c.id = ?
    `).get(campaignId);

    if (!campaign) return { success: false, error: 'Campaign not found' };

    // Update status to sending
    db.prepare(`UPDATE campaigns SET status = 'sending', started_at = CURRENT_TIMESTAMP WHERE id = ?`).run(campaignId);

    const recipients = db.prepare(`
        SELECT cr.*, c.phone, c.name as contact_name
        FROM campaign_recipients cr
        JOIN contacts c ON cr.contact_id = c.id
        WHERE cr.campaign_id = ? AND cr.status = 'pending'
    `).all(campaignId);

    console.log(`📤 Starting campaign "${campaign.name}" - ${recipients.length} recipients`);

    let sent = 0, failed = 0;

    for (const recipient of recipients) {
        try {
            const result = await sendTemplateMessage(
                recipient.phone,
                campaign.template_name,
                campaign.template_language || 'en_US',
                [],
                campaign.channel_id
            );

            if (result.success) {
                db.prepare(`
                    UPDATE campaign_recipients
                    SET status = 'sent', whatsapp_message_id = ?, sent_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(result.messageId, recipient.id);
                sent++;
            } else {
                db.prepare(`
                    UPDATE campaign_recipients
                    SET status = 'failed', failed_at = CURRENT_TIMESTAMP, error_message = ?
                    WHERE id = ?
                `).run(result.error, recipient.id);
                failed++;
            }

            // Update campaign stats
            db.prepare(`
                UPDATE campaigns SET sent = ?, failed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(sent, failed, campaignId);

            // Rate limiting: 1 message per 1 second to avoid spam
            await delay(1000);

        } catch (err) {
            console.error(`Error sending to ${recipient.phone}:`, err.message);
            db.prepare(`
                UPDATE campaign_recipients
                SET status = 'failed', failed_at = CURRENT_TIMESTAMP, error_message = ?
                WHERE id = ?
            `).run(err.message, recipient.id);
            failed++;
        }
    }

    // Mark campaign as completed
    const completedStatus = failed === recipients.length ? 'failed' : 'completed';
    db.prepare(`
        UPDATE campaigns
        SET status = ?, sent = ?, failed = ?, total_recipients = ?,
            completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(completedStatus, sent, failed, recipients.length, campaignId);

    console.log(`✅ Campaign "${campaign.name}" completed: ${sent} sent, ${failed} failed`);
    return { success: true, sent, failed, total: recipients.length };
}

module.exports = { executeCampaign };
