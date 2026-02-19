const router = require('express').Router()
// GET  /api/export/entity-report/:entityId  — PDF report of all entries for entity
// POST /api/export/shareable-link           — create shareable link
// GET  /api/export/shareable/:token         — resolve shareable link (public)
// DELETE /api/export/shareable/:id          — revoke shareable link
module.exports = router
