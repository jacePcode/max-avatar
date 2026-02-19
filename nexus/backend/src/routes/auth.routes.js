const router = require('express').Router()
const ctrl = require('../controllers/auth.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.post('/register', ctrl.register)
router.post('/login',    ctrl.login)
router.get('/me',        requireAuth, ctrl.me)
router.post('/invite',   requireAuth, requireAdmin, ctrl.createInvite)
router.get('/invites',   requireAuth, requireAdmin, ctrl.listInvites)

module.exports = router
