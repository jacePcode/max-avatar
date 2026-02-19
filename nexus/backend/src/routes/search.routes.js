const router = require('express').Router()
// GET  /api/search               — full-text search across entries + entities
// POST /api/search/natural        — natural language search via Gemini
// GET  /api/search/saved          — list saved searches
// POST /api/search/saved          — save a search preset
// DELETE /api/search/saved/:id    — delete saved search
module.exports = router
