// Placeholder — will be implemented in Module 9 (Auth)
const { asyncHandler } = require('../middleware/errorHandler')

exports.register = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

exports.login = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

exports.me = asyncHandler(async (req, res) => {
  res.json(req.user)
})

exports.createInvite = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})
