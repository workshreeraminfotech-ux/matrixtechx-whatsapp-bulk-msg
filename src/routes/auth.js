// MatrixTechX - Auth Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({
        success: true,
        data: {
            token,
            user: userWithoutPassword
        }
    });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ success: true, data: userWithoutPassword });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const db = getDB();

    if (!bcrypt.compareSync(currentPassword, req.user.password)) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hashedPassword, req.user.id);

    res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = router;
