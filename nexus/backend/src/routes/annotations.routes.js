const router = require('express').Router()
// GET    /api/entries/:id/annotations       — list annotations on an entry
// POST   /api/entries/:id/annotations       — create annotation
// PUT    /api/annotations/:id               — update annotation note
// DELETE /api/annotations/:id               — delete annotation
// POST   /api/annotations/:id/spawn-entry   — create new entry from annotation
module.exports = router
