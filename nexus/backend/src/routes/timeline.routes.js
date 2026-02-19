const router = require('express').Router()
const ctrl = require('../controllers/timeline.controller')

// GET /api/timeline        — chronological entries list (filterable)
router.get('/', ctrl.list)
// GET /api/timeline/stats  — yearly + monthly counts for the scrubber
router.get('/stats', ctrl.stats)

module.exports = router
