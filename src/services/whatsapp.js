// MatrixTechX - WhatsApp Cloud API Service
const axios = require('axios');
const { getDB } = require('../database/db');

const WA_API_BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v20.0'}`;

// Get channel config from DB or env
function getChannelConfig(channelId) {
    const db = getDB();
    if (channelId) {
        const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
        if (ch) return ch;
    }
    return {
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        access_token: process.env.WHATSAPP_ACCESS_TOKEN,
        business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    };
}

// Send text message
async function sendTextMessage(to, text, channelId) {
    const config = getChannelConfig(channelId);
    try {
        const res = await axios.post(
            `${WA_API_BASE}/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { preview_url: false, body: text }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { success: true, messageId: res.data.messages?.[0]?.id };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return { success: false, error: errMsg };
    }
}

// Send template message
async function sendTemplateMessage(to, templateName, languageCode, components, channelId) {
    const config = getChannelConfig(channelId);
    try {
        const res = await axios.post(
            `${WA_API_BASE}/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode || 'en_US' },
                    components: components || []
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { success: true, messageId: res.data.messages?.[0]?.id };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return { success: false, error: errMsg };
    }
}

// Get templates from WhatsApp Business API
async function syncTemplatesFromWhatsApp(channelId) {
    const config = getChannelConfig(channelId);
    if (!config.business_account_id || !config.access_token || config.access_token === 'your_permanent_access_token_here') {
        return { success: false, error: 'WhatsApp API not configured' };
    }
    try {
        const res = await axios.get(
            `${WA_API_BASE}/${config.business_account_id}/message_templates`,
            {
                params: { limit: 100 },
                headers: { 'Authorization': `Bearer ${config.access_token}` }
            }
        );
        return { success: true, templates: res.data.data || [] };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return { success: false, error: errMsg };
    }
}

// Create template in WhatsApp Business API
async function createWhatsAppTemplate(templateData, channelId) {
    const config = getChannelConfig(channelId);
    if (!config.business_account_id || !config.access_token || config.access_token === 'your_permanent_access_token_here') {
        return { success: false, error: 'WhatsApp API not configured. Template saved locally.' };
    }
    try {
        const components = [];

        if (templateData.header_type && templateData.header_content) {
            components.push({
                type: 'HEADER',
                format: templateData.header_type.toUpperCase(),
                text: templateData.header_content
            });
        }

        components.push({
            type: 'BODY',
            text: templateData.body
        });

        if (templateData.footer) {
            components.push({ type: 'FOOTER', text: templateData.footer });
        }

        const buttons = JSON.parse(templateData.buttons || '[]');
        if (buttons.length > 0) {
            components.push({ type: 'BUTTONS', buttons });
        }

        const res = await axios.post(
            `${WA_API_BASE}/${config.business_account_id}/message_templates`,
            {
                name: templateData.name,
                category: templateData.category || 'MARKETING',
                language: templateData.language || 'en_US',
                components
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { success: true, templateId: res.data.id, status: res.data.status };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return { success: false, error: errMsg };
    }
}

// Send media message
async function sendMediaMessage(to, type, mediaUrl, caption, channelId) {
    const config = getChannelConfig(channelId);
    try {
        const mediaObj = { link: mediaUrl };
        if (caption) mediaObj.caption = caption;

        const res = await axios.post(
            `${WA_API_BASE}/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: type,
                [type]: mediaObj
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { success: true, messageId: res.data.messages?.[0]?.id };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return { success: false, error: errMsg };
    }
}

module.exports = {
    sendTextMessage,
    sendTemplateMessage,
    syncTemplatesFromWhatsApp,
    createWhatsAppTemplate,
    sendMediaMessage
};
