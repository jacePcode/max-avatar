const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const db = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, inviteCode } = req.body
  if (!username || !email || !password || !inviteCode) {
    return res.status(400).json({ error: 'username, email, password, and inviteCode are required' })
  }

  // Validate invite code
  const { rows: invites } = await db.query(
    `SELECT * FROM invite_codes
     WHERE code = $1 AND is_active = true AND used_by IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [inviteCode]
  )
  if (!invites[0]) {
    return res.status(400).json({ error: 'Invalid or expired invite code' })
  }
  const invite = invites[0]

  // Check duplicates
  const { rows: existing } = await db.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username.toLowerCase(), email.toLowerCase()]
  )
  if (existing[0]) {
    return res.status(409).json({ error: 'Username or email already taken' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const client = await db.getClient()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO users (username, email, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4, $1) RETURNING id, username, email, role`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, invite.role]
    )
    const user = rows[0]
    await client.query(
      'UPDATE invite_codes SET used_by = $1, used_at = NOW(), is_active = false WHERE id = $2',
      [user.id, invite.id]
    )
    await client.query('COMMIT')
    const token = signToken(user.id)
    res.status(201).json({ token, user })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' })
  }
  const { rows } = await db.query(
    `SELECT id, username, email, role, password_hash, is_active, display_name, avatar_url
     FROM users WHERE username = $1 OR email = $1`,
    [username.toLowerCase()]
  )
  const user = rows[0]
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = signToken(user.id)
  const { password_hash: _, ...safeUser } = user
  res.json({ token, user: safeUser })
})

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, username, email, role, display_name, avatar_url, created_at FROM users WHERE id = $1',
    [req.user.id]
  )
  res.json(rows[0])
})

// POST /api/auth/invite  (admin only)
exports.createInvite = asyncHandler(async (req, res) => {
  const { role = 'editor', expiresInDays } = req.body
  const code = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000)
    : null
  const { rows } = await db.query(
    `INSERT INTO invite_codes (code, created_by, role, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [code, req.user.id, role, expiresAt]
  )
  res.status(201).json(rows[0])
})

// GET /api/auth/invites  (admin only)
exports.listInvites = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ic.*, u.username AS used_by_username
     FROM invite_codes ic
     LEFT JOIN users u ON u.id = ic.used_by
     WHERE ic.created_by = $1
     ORDER BY ic.created_at DESC`,
    [req.user.id]
  )
  res.json(rows)
})
