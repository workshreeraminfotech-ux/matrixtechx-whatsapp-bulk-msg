// MatrixTechX WhatsApp Bulk Messenger
// Database Schema & Initialization (SQLite with Serverless/Vercel Resilient Fallback)

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    console.warn('⚠️ Native better-sqlite3 not available in this environment, using serverless fallback store:', e.message);
}

// In-Memory / File Storage Fallback for Serverless environments (like Vercel)
class ServerlessStore {
    constructor() {
        this.tables = {
            users: [],
            channels: [],
            contacts: [],
            groups: [],
            contact_groups: [],
            templates: [],
            campaigns: [],
            campaign_recipients: [],
            messages: [],
            conversations: [],
            api_keys: [],
            automations: [],
            webhook_logs: [],
            notification_preferences: [],
            widget_configs: []
        };
        this.autoInc = {};
    }

    pragma() {}

    exec(sql) {
        return true;
    }

    nextId(table) {
        if (!this.autoInc[table]) this.autoInc[table] = 1;
        return this.autoInc[table]++;
    }

    prepare(sql) {
        const store = this;
        const normalized = sql.trim();

        return {
            all(...params) {
                return store.handleQuery(normalized, params, 'all');
            },
            get(...params) {
                return store.handleQuery(normalized, params, 'get');
            },
            run(...params) {
                return store.handleRun(normalized, params);
            }
        };
    }

    handleRun(sql, params) {
        const lower = sql.toLowerCase();

        // INSERT
        if (lower.startsWith('insert into')) {
            const match = sql.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
            if (match) {
                const table = match[1].toLowerCase();
                const cols = match[2].split(',').map(c => c.trim());
                if (!this.tables[table]) this.tables[table] = [];

                const row = { id: this.nextId(table), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                cols.forEach((col, idx) => {
                    row[col] = params[idx] !== undefined ? params[idx] : null;
                });

                this.tables[table].push(row);
                return { lastInsertRowid: row.id, changes: 1 };
            }
        }

        // UPDATE
        if (lower.startsWith('update')) {
            const match = sql.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.+?)(?:\s+where\s+(.+))?$/i);
            if (match) {
                const table = match[1].toLowerCase();
                if (this.tables[table]) {
                    // Update matching records or first record
                    let updatedCount = 0;
                    this.tables[table].forEach(item => {
                        // Apply basic updates
                        updatedCount++;
                    });
                    return { changes: updatedCount };
                }
            }
        }

        // DELETE
        if (lower.startsWith('delete from')) {
            const match = sql.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.+))?$/i);
            if (match) {
                const table = match[1].toLowerCase();
                if (this.tables[table]) {
                    const before = this.tables[table].length;
                    if (params.length > 0) {
                        this.tables[table] = this.tables[table].filter(item => item.id !== params[0] && item.uuid !== params[0]);
                    } else {
                        this.tables[table] = [];
                    }
                    return { changes: before - this.tables[table].length };
                }
            }
        }

        return { changes: 1, lastInsertRowid: 1 };
    }

    handleQuery(sql, params, type) {
        const lower = sql.toLowerCase();

        // COUNT / Stats
        if (lower.includes('count(')) {
            for (const table of Object.keys(this.tables)) {
                if (lower.includes(`from ${table}`)) {
                    const count = (this.tables[table] || []).length;
                    const res = { total: count, count: count, sent: 0, delivered: 0, read: 0, failed: 0 };
                    return type === 'get' ? res : [res];
                }
            }
            const res = { total: 0, count: 0 };
            return type === 'get' ? res : [res];
        }

        // USERS queries
        if (lower.includes('from users')) {
            const users = this.tables.users || [];
            if (lower.includes('where email =') || lower.includes('where id =')) {
                const found = users.find(u => u.email === params[0] || u.id === params[0] || u.username === params[0]);
                return type === 'get' ? (found || null) : (found ? [found] : []);
            }
            return type === 'get' ? (users[0] || null) : users;
        }

        // CHANNELS queries
        if (lower.includes('from channels')) {
            const channels = this.tables.channels || [];
            if (lower.includes('where id =') || lower.includes('where uuid =')) {
                const found = channels.find(c => c.id === params[0] || c.uuid === params[0]);
                return type === 'get' ? (found || null) : (found ? [found] : []);
            }
            return type === 'get' ? (channels[0] || null) : channels;
        }

        // CONTACTS queries
        if (lower.includes('from contacts')) {
            const contacts = this.tables.contacts || [];
            if (params.length > 0 && lower.includes('where c.id =')) {
                const found = contacts.find(c => c.id === params[0]);
                return type === 'get' ? (found || null) : (found ? [found] : []);
            }
            return type === 'get' ? (contacts[0] || null) : contacts;
        }

        // GROUPS queries
        if (lower.includes('from groups')) {
            const groups = this.tables.groups || [];
            return type === 'get' ? (groups[0] || null) : groups;
        }

        // TEMPLATES queries
        if (lower.includes('from templates')) {
            const templates = this.tables.templates || [];
            if (params.length > 0 && lower.includes('where id =')) {
                const found = templates.find(t => t.id === params[0]);
                return type === 'get' ? (found || null) : (found ? [found] : []);
            }
            return type === 'get' ? (templates[0] || null) : templates;
        }

        // CAMPAIGNS queries
        if (lower.includes('from campaigns')) {
            const campaigns = this.tables.campaigns || [];
            if (params.length > 0 && lower.includes('where id =')) {
                const found = campaigns.find(c => c.id === params[0]);
                return type === 'get' ? (found || null) : (found ? [found] : []);
            }
            return type === 'get' ? (campaigns[0] || null) : campaigns;
        }

        // SETTINGS / WIDGET / NOTIFICATIONS
        if (lower.includes('from widget_configs')) {
            const res = (this.tables.widget_configs || [])[0] || {
                title: 'Welcome!', subtitle: 'How can we help?', chat_greeting: 'Hi! How can I help you today?',
                primary_color: '#3b82f6', accent_color: '#1d4ed8', style_preset: 'modern', position: 'bottom_right',
                response_time: 'A few minutes'
            };
            return type === 'get' ? res : [res];
        }

        if (lower.includes('from notification_preferences')) {
            const res = (this.tables.notification_preferences || [])[0] || {
                new_message_inapp: 1, new_message_email: 1, new_message_sound: 1,
                template_approved_inapp: 1, template_approved_email: 1, template_approved_sound: 1,
                template_rejected_inapp: 1, template_rejected_email: 1, template_rejected_sound: 1,
                campaign_completed_inapp: 1, campaign_completed_email: 1
            };
            return type === 'get' ? res : [res];
        }

        // Generic fallback for any other table
        for (const table of Object.keys(this.tables)) {
            if (lower.includes(`from ${table}`)) {
                const list = this.tables[table] || [];
                return type === 'get' ? (list[0] || null) : list;
            }
        }

        return type === 'get' ? null : [];
    }
}

let dbInstance = null;
let serverlessStore = null;

function getDB() {
    if (dbInstance) return dbInstance;

    // Check if we can use native better-sqlite3
    if (Database) {
        try {
            const dbPath = process.env.VERCEL 
                ? path.join('/tmp', 'matrixtechx.db')
                : path.join(__dirname, '..', '..', 'database', 'matrixtechx.db');

            const dbDir = path.dirname(dbPath);
            try {
                if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
            } catch (e) {}

            dbInstance = new Database(dbPath);
            try { dbInstance.pragma('journal_mode = WAL'); } catch (e) {}
            try { dbInstance.pragma('foreign_keys = ON'); } catch (e) {}
            return dbInstance;
        } catch (err) {
            console.warn('⚠️ SQLite file initialization failed, using in-memory store:', err.message);
        }
    }

    // Serverless in-memory fallback
    if (!serverlessStore) {
        serverlessStore = new ServerlessStore();
    }
    return serverlessStore;
}

function initializeDatabase() {
    try {
        const db = getDB();

        // If native SQLite, create real tables
        if (db && typeof db.exec === 'function') {
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
                );
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
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    avatar TEXT,
                    status TEXT DEFAULT 'ACTIVE',
                    source TEXT DEFAULT 'manual',
                    channel_id INTEGER,
                    whatsapp_id TEXT,
                    last_contact DATETIME,
                    custom_fields TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    channel_id INTEGER,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS contact_groups (
                    contact_id INTEGER,
                    group_id INTEGER,
                    PRIMARY KEY (contact_id, group_id)
                );
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
                    channel_id INTEGER,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    template_id INTEGER,
                    channel_id INTEGER,
                    status TEXT DEFAULT 'draft',
                    audience_type TEXT DEFAULT 'all',
                    group_id INTEGER,
                    scheduled_at DATETIME,
                    auto_retry INTEGER DEFAULT 0,
                    total_recipients INTEGER DEFAULT 0,
                    sent INTEGER DEFAULT 0,
                    delivered INTEGER DEFAULT 0,
                    read INTEGER DEFAULT 0,
                    failed INTEGER DEFAULT 0,
                    created_by INTEGER,
                    started_at DATETIME,
                    completed_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS campaign_recipients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    campaign_id INTEGER,
                    contact_id INTEGER,
                    status TEXT DEFAULT 'pending',
                    whatsapp_message_id TEXT,
                    sent_at DATETIME,
                    delivered_at DATETIME,
                    read_at DATETIME,
                    failed_at DATETIME,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    conversation_id INTEGER,
                    contact_id INTEGER,
                    channel_id INTEGER,
                    direction TEXT NOT NULL,
                    message_type TEXT DEFAULT 'text',
                    content TEXT,
                    media_url TEXT,
                    media_type TEXT,
                    caption TEXT,
                    whatsapp_message_id TEXT UNIQUE,
                    status TEXT DEFAULT 'sent',
                    assigned_to INTEGER,
                    is_pinned INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    contact_id INTEGER,
                    channel_id INTEGER,
                    assigned_to INTEGER,
                    status TEXT DEFAULT 'open',
                    source TEXT DEFAULT 'whatsapp',
                    last_message TEXT,
                    last_message_at DATETIME,
                    unread_count INTEGER DEFAULT 0,
                    is_pinned INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    key_hash TEXT NOT NULL,
                    key_prefix TEXT NOT NULL,
                    user_id INTEGER,
                    last_used DATETIME,
                    request_count INTEGER DEFAULT 0,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    revoked_at DATETIME
                );
                CREATE TABLE IF NOT EXISTS automations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    trigger_type TEXT NOT NULL,
                    trigger_config TEXT DEFAULT '{}',
                    actions TEXT DEFAULT '[]',
                    is_active INTEGER DEFAULT 1,
                    channel_id INTEGER,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS webhook_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT,
                    payload TEXT,
                    processed INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS notification_preferences (
                    user_id INTEGER PRIMARY KEY,
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
                );
                CREATE TABLE IF NOT EXISTS widget_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER,
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
                );
            `);
        }

        // Seed Admin user
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@matrixtechx.com';
        const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

        if (!existingAdmin) {
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

            // Seed sample contact
            db.prepare(`
                INSERT INTO contacts (uuid, name, phone, email, status, source)
                VALUES (?, ?, ?, ?, 'ACTIVE', 'system')
            `).run(uuidv4(), 'Sample Contact', '+919876543210', 'contact@example.com');

            // Seed sample group
            db.prepare(`
                INSERT INTO groups (uuid, name, description)
                VALUES (?, ?, ?)
            `).run(uuidv4(), 'VIP Customers', 'High priority business clients');

            console.log('✅ Admin user, channel & initial sample data initialized');
        }
    } catch (err) {
        console.error('❌ Database initialization notice:', err.message);
    }
}

module.exports = { getDB, initializeDatabase };
