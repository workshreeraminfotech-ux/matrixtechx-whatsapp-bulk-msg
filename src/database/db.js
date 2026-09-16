// MatrixTechX WhatsApp Bulk Messenger
// Database Schema & Initialization (SQLite)

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_PATH = path.join(__dirname, '..', 'database', 'matrixtechx.db');

let db;

function getDB() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initializeDatabase() {
    const db = getDB();

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            avatar TEXT,
            is_active INTEGER DEFAULT 1,
            -- Permissions
            perm_manage_contacts INTEGER DEFAULT 0,
            perm_manage_campaigns INTEGER DEFAULT 0,
            perm_manage_templates INTEGER DEFAULT 0,
            perm_view_analytics INTEGER DEFAULT 0,
            perm_manage_team INTEGER DEFAULT 0,
            perm_manage_inbox INTEGER DEFAULT 0,
            perm_manage_settings INTEGER DEFAULT 0,
            perm_manage_automations INTEGER DEFAULT 0,
            perm_general_settings INTEGER DEFAULT 0,
            perm_manage_widgets INTEGER DEFAULT 0,
            perm_manage_support INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // WhatsApp Channels (connected phone numbers)
    db.exec(`
        CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone_number TEXT,
            phone_number_id TEXT,
            business_account_id TEXT,
            access_token TEXT,
            webhook_verify_token TEXT,
            status TEXT DEFAULT 'disconnected',
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Contacts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            avatar TEXT,
            status TEXT DEFAULT 'ACTIVE',
            source TEXT DEFAULT 'manual',
            channel_id INTEGER REFERENCES channels(id),
            whatsapp_id TEXT,
            last_contact DATETIME,
            custom_fields TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Groups table
    db.exec(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            channel_id INTEGER REFERENCES channels(id),
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Contact-Group mapping
    db.exec(`
        CREATE TABLE IF NOT EXISTS contact_groups (
            contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
            group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
            PRIMARY KEY (contact_id, group_id)
        )
    `);

    // Message Templates
    db.exec(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'MARKETING',
            language TEXT DEFAULT 'en_US',
            status TEXT DEFAULT 'PENDING',
            template_type TEXT DEFAULT 'CUSTOM',
            header_type TEXT,
            header_content TEXT,
            body TEXT NOT NULL,
            footer TEXT,
            buttons TEXT DEFAULT '[]',
            whatsapp_template_id TEXT,
            channel_id INTEGER REFERENCES channels(id),
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Campaigns table
    db.exec(`
        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            template_id INTEGER REFERENCES templates(id),
            channel_id INTEGER REFERENCES channels(id),
            status TEXT DEFAULT 'draft',
            audience_type TEXT DEFAULT 'all',
            group_id INTEGER REFERENCES groups(id),
            scheduled_at DATETIME,
            auto_retry INTEGER DEFAULT 0,
            total_recipients INTEGER DEFAULT 0,
            sent INTEGER DEFAULT 0,
            delivered INTEGER DEFAULT 0,
            read INTEGER DEFAULT 0,
            failed INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            started_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Campaign Recipients
    db.exec(`
        CREATE TABLE IF NOT EXISTS campaign_recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
            contact_id INTEGER REFERENCES contacts(id),
            status TEXT DEFAULT 'pending',
            whatsapp_message_id TEXT,
            sent_at DATETIME,
            delivered_at DATETIME,
            read_at DATETIME,
            failed_at DATETIME,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Messages (Inbox)
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            conversation_id INTEGER,
            contact_id INTEGER REFERENCES contacts(id),
            channel_id INTEGER REFERENCES channels(id),
            direction TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            content TEXT,
            media_url TEXT,
            media_type TEXT,
            caption TEXT,
            whatsapp_message_id TEXT UNIQUE,
            status TEXT DEFAULT 'sent',
            assigned_to INTEGER REFERENCES users(id),
            is_pinned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Conversations (Team Inbox)
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            contact_id INTEGER REFERENCES contacts(id),
            channel_id INTEGER REFERENCES channels(id),
            assigned_to INTEGER REFERENCES users(id),
            status TEXT DEFAULT 'open',
            source TEXT DEFAULT 'whatsapp',
            last_message TEXT,
            last_message_at DATETIME,
            unread_count INTEGER DEFAULT 0,
            is_pinned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // API Keys
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            key_hash TEXT NOT NULL,
            key_prefix TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id),
            last_used DATETIME,
            request_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            revoked_at DATETIME
        )
    `);

    // Automations
    db.exec(`
        CREATE TABLE IF NOT EXISTS automations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            trigger_type TEXT NOT NULL,
            trigger_config TEXT DEFAULT '{}',
            actions TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            channel_id INTEGER REFERENCES channels(id),
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Webhook Logs
    db.exec(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            payload TEXT,
            processed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Notification preferences
    db.exec(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
            user_id INTEGER PRIMARY KEY REFERENCES users(id),
            new_message_inapp INTEGER DEFAULT 1,
            new_message_email INTEGER DEFAULT 1,
            new_message_sound INTEGER DEFAULT 1,
            template_approved_inapp INTEGER DEFAULT 1,
            template_approved_email INTEGER DEFAULT 1,
            template_approved_sound INTEGER DEFAULT 1,
            template_rejected_inapp INTEGER DEFAULT 1,
            template_rejected_email INTEGER DEFAULT 1,
            template_rejected_sound INTEGER DEFAULT 1,
            campaign_completed_inapp INTEGER DEFAULT 1,
            campaign_completed_email INTEGER DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Widget configurations
    db.exec(`
        CREATE TABLE IF NOT EXISTS widget_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER REFERENCES channels(id),
            title TEXT DEFAULT 'Welcome!',
            subtitle TEXT DEFAULT 'How can we help?',
            site_name TEXT,
            allowed_domain TEXT,
            chat_greeting TEXT DEFAULT 'Hi! How can I help you today?',
            response_time TEXT DEFAULT 'A few minutes',
            primary_color TEXT DEFAULT '#3b82f6',
            accent_color TEXT DEFAULT '#1d4ed8',
            style_preset TEXT DEFAULT 'modern',
            position TEXT DEFAULT 'bottom_right',
            logo_url TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('✅ Database tables created/verified');

    // Seed admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@matrixtechx.com';
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

    if (!existingAdmin) {
        const { v4: uuidv4 } = require('uuid');
        const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123456', 10);
        db.prepare(`
            INSERT INTO users (uuid, name, email, username, password, role,
                perm_manage_contacts, perm_manage_campaigns, perm_manage_templates,
                perm_view_analytics, perm_manage_team, perm_manage_inbox,
                perm_manage_settings, perm_manage_automations, perm_general_settings,
                perm_manage_widgets, perm_manage_support)
            VALUES (?, ?, ?, ?, ?, 'admin', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
        `).run(uuidv4(), process.env.ADMIN_NAME || 'MatrixTechX Admin', adminEmail, 'admin', hashedPassword);

        // Seed default channel
        db.prepare(`
            INSERT INTO channels (uuid, name, phone_number_id, access_token, webhook_verify_token, created_by)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(uuidv4(), 'Main Channel',
            process.env.WHATSAPP_PHONE_NUMBER_ID || '',
            process.env.WHATSAPP_ACCESS_TOKEN || '',
            process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'matrixtechx_webhook_verify_2024');

        console.log('✅ Admin user and default channel created');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    }
}

module.exports = { getDB, initializeDatabase };
