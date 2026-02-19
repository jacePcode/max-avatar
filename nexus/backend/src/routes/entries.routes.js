const router = require('express').Router()
const ctrl = require('../controllers/entries.controller')
const { requireEditor, requireAdmin } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.get('/',                       ctrl.list)
router.post('/',    requireEditor,    upload.single('file'), ctrl.create)
router.get('/:id',                    ctrl.get)
router.put('/:id',  requireEditor,    ctrl.update)
router.delete('/:id', requireAdmin,   ctrl.remove)

router.get('/:id/versions',           ctrl.getVersions)
router.post('/:id/flag',  requireEditor, ctrl.flag)
router.post('/:id/unflag',requireEditor, ctrl.unflag)
router.get('/:id/connections',        ctrl.getConnections)
router.post('/:id/connections', requireEditor, ctrl.addConnection)

module.exports = router
