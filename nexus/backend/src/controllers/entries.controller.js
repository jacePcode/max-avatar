// Placeholder — will be implemented in Module 1 (Entry System)
const { asyncHandler } = require('../middleware/errorHandler')

exports.list   = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.create = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.get    = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.update = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.remove = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
