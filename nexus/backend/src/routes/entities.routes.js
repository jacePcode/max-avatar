const router = require('express').Router()
// GET    /api/entities          — list entities (filterable by type)
// POST   /api/entities          — create entity
// GET    /api/entities/:id      — get single entity with linked entries
// PUT    /api/entities/:id      — update entity
// DELETE /api/entities/:id      — delete entity (admin)
// POST   /api/entities/:id/relationships  — add relationship
// GET    /api/entities/:id/relationships  — list relationships
// GET    /api/entities/:id/entries        — entries linked to this entity
module.exports = router
