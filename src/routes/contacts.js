// MatrixTechX - Contacts Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/contacts - List all contacts
router.get('/', (req, res) => {
    const db = getDB();
    const { search, group, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT c.*,
            GROUP_CONCAT(g.name) as group_names,
            GROUP_CONCAT(g.id) as group_ids
        FROM contacts c
        LEFT JOIN contact_groups cg ON c.id = cg.contact_id
        LEFT JOIN groups g ON cg.group_id = g.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
        query += ` AND c.status = ?`;
        params.push(status);
    }
    if (group) {
        query += ` AND cg.group_id = ?`;
        params.push(group);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const contacts = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM contacts WHERE 1=1`).get().count;

    res.json({ success: true, data: contacts, total, page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/contacts - Create contact
router.post('/', (req, res) => {
    const { name, phone, email, groupIds, customFields } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'Name and phone are required' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(phone);
    if (existing) {
        return res.status(400).json({ success: false, error: 'Contact with this phone number already exists' });
    }

    const id = db.prepare(`
        INSERT INTO contacts (uuid, name, phone, email, custom_fields)
        VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), name, phone, email || null, JSON.stringify(customFields || {})).lastInsertRowid;

    // Add to groups if specified
    if (groupIds && groupIds.length > 0) {
        const stmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
        for (const gid of groupIds) stmt.run(id, gid);
    }

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: contact });
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', (req, res) => {
    const { name, phone, email, status, groupIds } = req.body;
    const db = getDB();

    const contact = db.prepare('SELECT * FROM contacts WHERE uuid = ?').get(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    db.prepare(`
        UPDATE contacts SET name = ?, phone = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(name || contact.name, phone || contact.phone, email || contact.email, status || contact.status, contact.id);

    if (groupIds !== undefined) {
        db.prepare('DELETE FROM contact_groups WHERE contact_id = ?').run(contact.id);
        if (groupIds.length > 0) {
            const stmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
            for (const gid of groupIds) stmt.run(contact.id, gid);
        }
    }

    const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact.id);
    res.json({ success: true, data: updated });
});

// DELETE /api/contacts/:id
router.delete('/:id', (req, res) => {
    const db = getDB();
    const contact = db.prepare('SELECT id FROM contacts WHERE uuid = ?').get(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    db.prepare('DELETE FROM contact_groups WHERE contact_id = ?').run(contact.id);
    db.prepare('DELETE FROM contacts WHERE id = ?').run(contact.id);
    res.json({ success: true, message: 'Contact deleted' });
});

// POST /api/contacts/import - Bulk import from JSON
router.post('/import', (req, res) => {
    const { contacts: contactList } = req.body;
    if (!contactList || !Array.isArray(contactList)) {
        return res.status(400).json({ success: false, error: 'contacts array is required' });
    }

    const db = getDB();
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO contacts (uuid, name, phone, email, source)
        VALUES (?, ?, ?, ?, 'import')
    `);

    let imported = 0, skipped = 0;
    const importMany = db.transaction(() => {
        for (const c of contactList) {
            if (!c.name || !c.phone) { skipped++; continue; }
            const r = stmt.run(uuidv4(), c.name, c.phone.toString(), c.email || null);
            if (r.changes > 0) imported++;
            else skipped++;
        }
    });
    importMany();

    res.json({ success: true, imported, skipped, total: contactList.length });
});

// GET /api/contacts/export - Export contacts as JSON
router.get('/export', (req, res) => {
    const db = getDB();
    const contacts = db.prepare('SELECT name, phone, email, status, source, created_at FROM contacts').all();
    res.json({ success: true, data: contacts });
});

module.exports = router;
