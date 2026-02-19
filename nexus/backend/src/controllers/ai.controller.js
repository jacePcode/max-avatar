// Placeholder — will be implemented in Module 5 (AI Layer)
const { asyncHandler } = require('../middleware/errorHandler')

exports.analyzeEntry     = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.entryChat        = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.globalChat       = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.contradict       = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.acceptExtraction = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
exports.rejectExtraction = asyncHandler(async (req, res) => res.status(501).json({ message: 'Not yet implemented' }))
