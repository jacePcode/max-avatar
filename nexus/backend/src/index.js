require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const path = require('path')
const logger = require('./config/logger')
const { errorHandler } = require('./middleware/errorHandler')
const { requireAuth } = require('./middleware/auth')

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/auth.routes')
const entriesRoutes     = require('./routes/entries.routes')
const entitiesRoutes    = require('./routes/entities.routes')
const aiRoutes          = require('./routes/ai.routes')
const searchRoutes      = require('./routes/search.routes')
const graphRoutes       = require('./routes/graph.routes')
const timelineRoutes    = require('./routes/timeline.routes')
const mapRoutes         = require('./routes/map.routes')
const annotationsRoutes = require('./routes/annotations.routes')
const commentsRoutes    = require('./routes/comments.routes')
const activityRoutes    = require('./routes/activity.routes')
const exportRoutes      = require('./routes/export.routes')
const tagsRoutes        = require('./routes/tags.routes')
const usersRoutes       = require('./routes/users.routes')

const app = express()

// ─── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})
app.use('/api/', limiter)

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
})
app.use('/api/auth/', authLimiter)

// ─── Static file serving (uploads) ────────────────────────────────────────────
// Files are served at /files/:filename — only authenticated users should access
app.use('/files', requireAuth, express.static(
  path.resolve(process.env.UPLOAD_DIR || './uploads')
))

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes)

// All routes below require authentication
app.use('/api/entries',     requireAuth, entriesRoutes)
app.use('/api/entities',    requireAuth, entitiesRoutes)
app.use('/api/ai',          requireAuth, aiRoutes)
app.use('/api/search',      requireAuth, searchRoutes)
app.use('/api/graph',       requireAuth, graphRoutes)
app.use('/api/timeline',    requireAuth, timelineRoutes)
app.use('/api/map',         requireAuth, mapRoutes)
app.use('/api/annotations', requireAuth, annotationsRoutes)
app.use('/api/comments',    requireAuth, commentsRoutes)
app.use('/api/activity',    requireAuth, activityRoutes)
app.use('/api/export',      requireAuth, exportRoutes)
app.use('/api/tags',        requireAuth, tagsRoutes)
app.use('/api/users',       requireAuth, usersRoutes)

// ─── Health check (unauthenticated — useful for DigitalOcean monitors) ─────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ─── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10)
app.listen(PORT, () => {
  logger.info(`Nexus API server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})

module.exports = app
