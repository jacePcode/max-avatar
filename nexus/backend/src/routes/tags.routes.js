const router = require('express').Router()
const ctrl = require('../controllers/tags.controller')
const { requireEditor, requireAdmin } = require('../middleware/auth')

router.get('/',          ctrl.list)
router.post('/',         requireEditor, ctrl.create)
router.delete('/:id',    requireAdmin,  ctrl.remove)

module.exports = router
