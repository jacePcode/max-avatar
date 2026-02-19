const router = require('express').Router()
// GET    /api/entries           — list / search entries
// POST   /api/entries           — create entry (+ file upload)
// GET    /api/entries/:id       — get single entry
// PUT    /api/entries/:id       — update entry
// DELETE /api/entries/:id       — delete entry (admin)
// GET    /api/entries/:id/versions  — version history
// POST   /api/entries/:id/flag  — flag for review
// POST   /api/entries/:id/connections  — add connection
// GET    /api/entries/:id/connections  — list connections
module.exports = router
