const db = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

exports.list = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.*, COUNT(et.entry_id)::int AS entry_count
     FROM tags t
     LEFT JOIN entry_tags et ON et.tag_id = t.id
     GROUP BY t.id
     ORDER BY entry_count DESC, t.name ASC`
  )
  res.json(rows)
})

exports.create = asyncHandler(async (req, res) => {
  const { name, color } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const { rows } = await db.query(
    `INSERT INTO tags (name, color, created_by) VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING *`,
    [name.trim().toLowerCase(), color || '#f59e0b', req.user.id]
  )
  res.status(201).json(rows[0])
})

exports.remove = asyncHandler(async (req, res) => {
  await db.query('DELETE FROM tags WHERE id = $1', [req.params.id])
  res.status(204).send()
})
