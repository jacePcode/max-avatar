const router = require('express').Router()
// GET  /api/users          — list users (admin)
// GET  /api/users/:id      — get user profile
// PUT  /api/users/:id      — update user (self or admin)
// PUT  /api/users/:id/role — change user role (admin)
// DELETE /api/users/:id    — deactivate user (admin)
module.exports = router
