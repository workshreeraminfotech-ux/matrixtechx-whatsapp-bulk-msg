// MatrixTechX - Auth Middleware
const jwt = require('jsonwebtoken');
const { getDB } = require('../database/db');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const db = getDB();
        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(decoded.userId);

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found or inactive' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== 'admin' && req.user.role !== role) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    };
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (req.user.role === 'admin') return next();
        if (!req.user[`perm_${permission}`]) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        next();
    };
}

module.exports = { authenticateToken, requireRole, requirePermission };
