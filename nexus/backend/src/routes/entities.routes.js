const router = require('express').Router()
const ctrl = require('../controllers/entities.controller')
const { requireEditor, requireAdmin } = require('../middleware/auth')

// Core CRUD
router.get('/',           ctrl.list)
router.post('/',          requireEditor, ctrl.create)
router.get('/:id',        ctrl.get)
router.put('/:id',        requireEditor, ctrl.update)
router.delete('/:id',     requireAdmin,  ctrl.remove)

// Entry linking
router.get('/:id/entries',                      ctrl.getEntries)
router.post('/:id/entries',     requireEditor,  ctrl.linkEntry)
router.delete('/:id/entries/:entryId', requireEditor, ctrl.unlinkEntry)

// Relationships
router.get('/:id/relationships',                ctrl.getRelationships)
router.post('/:id/relationships', requireEditor, ctrl.addRelationship)
router.delete('/relationships/:relId', requireEditor, ctrl.removeRelationship)

// Shared connection strength (entries in common)
router.get('/:id/shared-connections', ctrl.sharedConnections)

module.exports = router
