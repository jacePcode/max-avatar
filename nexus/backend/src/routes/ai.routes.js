const router = require('express').Router()
// POST /api/ai/entries/:id/analyze        — run AI analysis on entry
// POST /api/ai/entries/:id/chat           — per-entry document Q&A
// GET  /api/ai/entries/:id/chat           — get chat history for entry
// POST /api/ai/extractions/:id/accept     — accept AI extraction suggestion
// POST /api/ai/extractions/:id/reject     — reject AI extraction suggestion
// GET  /api/ai/entries/:id/extractions    — get suggestions for entry
// POST /api/ai/global/chat                — global database Q&A message
// GET  /api/ai/global/chat/:sessionId     — get session message history
// GET  /api/ai/global/sessions            — list user's chat sessions
// POST /api/ai/contradict                 — analyze two entries for contradictions
// GET  /api/ai/suggested-connections      — get pending AI-suggested connections
// POST /api/ai/suggested-connections/:id/accept
// POST /api/ai/suggested-connections/:id/reject
module.exports = router
