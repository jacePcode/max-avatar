const logger = require('../config/logger')

// Catch-all error handler — must be registered last in Express
const errorHandler = (err, req, res, next) => {
  logger.error(err)

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors })
  }

  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' })
  }

  const status = err.status || err.statusCode || 500
  const message = status < 500 ? err.message : 'Internal server error'

  res.status(status).json({ error: message })
}

// Wrap async route handlers to forward errors to errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

module.exports = { errorHandler, asyncHandler }
