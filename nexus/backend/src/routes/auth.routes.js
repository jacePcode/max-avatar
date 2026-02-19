const router = require('express').Router()
// POST /api/auth/register  — register via invite code
// POST /api/auth/login     — login, returns JWT
// POST /api/auth/logout    — invalidate session (client-side JWT drop)
// GET  /api/auth/me        — current user info
// POST /api/auth/invite    — generate invite code (admin)
module.exports = router
