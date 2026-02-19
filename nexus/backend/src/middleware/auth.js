const jwt = require('jsonwebtoken')
const db = require('../config/db')

/**
 * Verifies JWT from Authorization: Bearer <token> header.
 * Attaches req.user = { id, username, role } on success.
 */
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const { rows } = await db.query(
      'SELECT id, username, role, is_active FROM users WHERE id = $1',
      [payload.sub]
    )
    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }
    req.user = rows[0]
    // Touch last_seen_at asynchronously (don't await — fire and forget)
    db.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [rows[0].id])
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Requires user to have at least 'editor' role.
 * Must be used after requireAuth.
 */
const requireEditor = (req, res, next) => {
  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot perform this action' })
  }
  next()
}

/**
 * Requires admin role.
 * Must be used after requireAuth.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

module.exports = { requireAuth, requireEditor, requireAdmin }
