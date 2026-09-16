// MatrixTechX - Groups Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/groups
router.get('/', (req, res) => {
    const db = getDB();
    const groups = db.prepare(`
        SELECT g.*, COUNT(cg.contact_id) as contact_count
        FROM groups g
        LEFT JOIN contact_groups cg ON g.id = cg.group_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
    `).all();
    res.json({ success: true, data: groups });
});

// POST /api/groups
router.post('/', (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Group name is required' });

    const db = getDB();
    const id = db.prepare(`
        INSERT INTO groups (uuid, name, description, created_by)
        VALUES (?, ?, ?, ?)
    `).run(uuidv4(), name, description || null, req.user.id).lastInsertRowid;

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: group });
});

// PUT /api/groups/:id
router.put('/:id', (req, res) => {
    const { name, description } = req.body;
    const db = getDB();
    const group = db.prepare('SELECT * FROM groups WHERE uuid = ?').get(req.params.id);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    db.prepare(`UPDATE groups SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(name || group.name, description || group.description, group.id);

    res.json({ success: true, data: db.prepare('SELECT * FROM groups WHERE id = ?').get(group.id) });
});

// DELETE /api/groups/:id
router.delete('/:id', (req, res) => {
    const db = getDB();
    const group = db.prepare('SELECT id FROM groups WHERE uuid = ?').get(req.params.id);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    db.prepare('DELETE FROM contact_groups WHERE group_id = ?').run(group.id);
    db.prepare('DELETE FROM groups WHERE id = ?').run(group.id);
    res.json({ success: true, message: 'Group deleted' });
});

// GET /api/groups/:id/contacts
router.get('/:id/contacts', (req, res) => {
    const db = getDB();
    const group = db.prepare('SELECT id FROM groups WHERE uuid = ?').get(req.params.id);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    const contacts = db.prepare(`
        SELECT c.* FROM contacts c
        JOIN contact_groups cg ON c.id = cg.contact_id
        WHERE cg.group_id = ?
        ORDER BY c.name
    `).all(group.id);
    res.json({ success: true, data: contacts });
});

// POST /api/groups/:id/contacts - Add contacts to group
router.post('/:id/contacts', (req, res) => {
    const { contactIds } = req.body;
    const db = getDB();
    const group = db.prepare('SELECT id FROM groups WHERE uuid = ?').get(req.params.id);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    const stmt = db.prepare('INSERT OR IGNORE INTO contact_groups (contact_id, group_id) VALUES (?, ?)');
    const addAll = db.transaction(() => {
        for (const cid of contactIds) stmt.run(cid, group.id);
    });
    addAll();

    res.json({ success: true, message: `${contactIds.length} contacts added to group` });
});

module.exports = router;
