const db = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')
const activity = require('../services/activity.service')

// ─── Helper: fetch full entity with entry count ───────────────────────────────
const fetchEntity = async (id) => {
  const { rows } = await db.query(
    `SELECT e.*,
            u.username AS added_by_username,
            COUNT(DISTINCT ee.entry_id)::int AS entry_count
     FROM entities e
     LEFT JOIN users u ON u.id = e.added_by
     LEFT JOIN entry_entities ee ON ee.entity_id = e.id
     WHERE e.id = $1
     GROUP BY e.id, u.username`,
    [id]
  )
  return rows[0] || null
}

// GET /api/entities
exports.list = asyncHandler(async (req, res) => {
  const { type, q, limit = 100, offset = 0 } = req.query
  const conditions = []
  const params = []
  let p = 1

  if (type) {
    conditions.push(`e.type = $${p}`)
    params.push(type); p++
  }
  if (q) {
    conditions.push(`(e.search_vector @@ plainto_tsquery('english', $${p}) OR e.name ILIKE $${p + 1})`)
    params.push(q, `%${q}%`); p += 2
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await db.query(
    `SELECT e.id, e.type, e.name, e.aliases, e.photo_url, e.date_of_birth,
            e.roles, e.org_type, e.place_type, e.latitude, e.longitude,
            e.description, e.created_at,
            u.username AS added_by_username,
            COUNT(DISTINCT ee.entry_id)::int AS entry_count
     FROM entities e
     LEFT JOIN users u ON u.id = e.added_by
     LEFT JOIN entry_entities ee ON ee.entity_id = e.id
     ${where}
     GROUP BY e.id, u.username
     ORDER BY entry_count DESC, e.name ASC
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  )

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total FROM entities e ${where}`,
    params
  )

  res.json({ entities: rows, total: parseInt(countRows[0].total, 10) })
})

// POST /api/entities
exports.create = asyncHandler(async (req, res) => {
  const {
    type, name, description, aliases, photo_url,
    date_of_birth, date_of_death, nationality, roles, org_type,
    founded_date, dissolved_date, latitude, longitude, address, place_type,
    metadata,
  } = req.body

  if (!type || !name) {
    return res.status(400).json({ error: 'type and name are required' })
  }

  const { rows } = await db.query(
    `INSERT INTO entities
       (type, name, description, aliases, photo_url, date_of_birth, date_of_death,
        nationality, roles, org_type, founded_date, dissolved_date,
        latitude, longitude, address, place_type, metadata, added_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      type, name, description || null,
      aliases ? (Array.isArray(aliases) ? aliases : [aliases]) : null,
      photo_url || null,
      date_of_birth || null, date_of_death || null, nationality || null,
      roles ? (Array.isArray(roles) ? roles : [roles]) : null,
      org_type || null, founded_date || null, dissolved_date || null,
      latitude || null, longitude || null, address || null, place_type || null,
      metadata ? JSON.stringify(metadata) : '{}',
      req.user.id,
    ]
  )

  activity.log({
    userId: req.user.id,
    actionType: 'entity.created',
    targetType: 'entity',
    targetId: rows[0].id,
    metadata: { name: rows[0].name, type: rows[0].type },
  })

  res.status(201).json(rows[0])
})

// GET /api/entities/:id
exports.get = asyncHandler(async (req, res) => {
  const entity = await fetchEntity(req.params.id)
  if (!entity) return res.status(404).json({ error: 'Entity not found' })
  res.json(entity)
})

// PUT /api/entities/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params
  const {
    name, description, aliases, photo_url,
    date_of_birth, date_of_death, nationality, roles, org_type,
    founded_date, dissolved_date, latitude, longitude, address, place_type,
  } = req.body

  const { rows } = await db.query(
    `UPDATE entities SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       aliases = COALESCE($3, aliases),
       photo_url = COALESCE($4, photo_url),
       date_of_birth = COALESCE($5, date_of_birth),
       date_of_death = COALESCE($6, date_of_death),
       nationality = COALESCE($7, nationality),
       roles = COALESCE($8, roles),
       org_type = COALESCE($9, org_type),
       founded_date = COALESCE($10, founded_date),
       dissolved_date = COALESCE($11, dissolved_date),
       latitude = COALESCE($12, latitude),
       longitude = COALESCE($13, longitude),
       address = COALESCE($14, address),
       place_type = COALESCE($15, place_type),
       updated_at = NOW()
     WHERE id = $16 RETURNING *`,
    [
      name, description,
      aliases ? (Array.isArray(aliases) ? aliases : [aliases]) : null,
      photo_url, date_of_birth, date_of_death, nationality,
      roles ? (Array.isArray(roles) ? roles : [roles]) : null,
      org_type, founded_date, dissolved_date,
      latitude, longitude, address, place_type,
      id,
    ]
  )

  if (!rows[0]) return res.status(404).json({ error: 'Entity not found' })

  activity.log({
    userId: req.user.id,
    actionType: 'entity.updated',
    targetType: 'entity',
    targetId: id,
    metadata: { name: rows[0].name },
  })

  const full = await fetchEntity(id)
  res.json(full)
})

// DELETE /api/entities/:id (admin)
exports.remove = asyncHandler(async (req, res) => {
  const { rows } = await db.query('SELECT id FROM entities WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Entity not found' })
  await db.query('DELETE FROM entities WHERE id = $1', [req.params.id])
  res.status(204).send()
})

// ─── Entry ↔ Entity linking ───────────────────────────────────────────────────

// GET /api/entities/:id/entries
exports.getEntries = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT e.id, e.title, e.type, e.event_date, e.credibility, e.ai_summary,
            e.created_at, ee.context,
            u.username AS added_by_username,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL), '[]'
            ) AS tags
     FROM entry_entities ee
     JOIN entries e ON e.id = ee.entry_id
     LEFT JOIN users u ON u.id = e.added_by
     LEFT JOIN entry_tags et ON et.entry_id = e.id
     LEFT JOIN tags t ON t.id = et.tag_id
     WHERE ee.entity_id = $1
     GROUP BY e.id, u.username, ee.context
     ORDER BY e.event_date DESC NULLS LAST, e.created_at DESC`,
    [req.params.id]
  )
  res.json(rows)
})

// POST /api/entities/:id/entries  — link an entry to this entity
exports.linkEntry = asyncHandler(async (req, res) => {
  const { entry_id, context } = req.body
  if (!entry_id) return res.status(400).json({ error: 'entry_id is required' })
  await db.query(
    `INSERT INTO entry_entities (entry_id, entity_id, context, created_by)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [entry_id, req.params.id, context || null, req.user.id]
  )
  res.status(201).json({ linked: true })
})

// DELETE /api/entities/:id/entries/:entryId
exports.unlinkEntry = asyncHandler(async (req, res) => {
  await db.query(
    'DELETE FROM entry_entities WHERE entity_id = $1 AND entry_id = $2',
    [req.params.id, req.params.entryId]
  )
  res.status(204).send()
})

// ─── Entity ↔ Entity relationships ───────────────────────────────────────────

// GET /api/entities/:id/relationships
exports.getRelationships = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT er.*,
            src.name AS source_name, src.type AS source_type,
            tgt.name AS target_name, tgt.type AS target_type,
            u.username AS created_by_username
     FROM entity_relationships er
     JOIN entities src ON src.id = er.source_id
     JOIN entities tgt ON tgt.id = er.target_id
     LEFT JOIN users u ON u.id = er.created_by
     WHERE er.source_id = $1 OR er.target_id = $1
     ORDER BY er.created_at DESC`,
    [req.params.id]
  )
  res.json(rows)
})

// POST /api/entities/:id/relationships
exports.addRelationship = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { target_id, relationship = 'other', label, description, date_from, date_to } = req.body
  if (!target_id) return res.status(400).json({ error: 'target_id is required' })
  if (id === target_id) return res.status(400).json({ error: 'Cannot relate entity to itself' })

  const { rows } = await db.query(
    `INSERT INTO entity_relationships
       (source_id, target_id, relationship, label, description, date_from, date_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, target_id, relationship, label || null, description || null,
     date_from || null, date_to || null, req.user.id]
  )
  activity.log({
    userId: req.user.id,
    actionType: 'entity.relationship_added',
    targetType: 'entity',
    targetId: id,
    metadata: { target_id, relationship },
  })
  res.status(201).json(rows[0])
})

// DELETE /api/entities/relationships/:relId
exports.removeRelationship = asyncHandler(async (req, res) => {
  await db.query('DELETE FROM entity_relationships WHERE id = $1', [req.params.relId])
  res.status(204).send()
})

// GET /api/entities/:id/shared-connections
// Returns entities sharing entries with this one, ranked by connection strength
exports.sharedConnections = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT other.id, other.name, other.type, other.photo_url, other.roles,
            COUNT(DISTINCT ee_self.entry_id)::int AS shared_entries
     FROM entry_entities ee_self
     JOIN entry_entities ee_other ON ee_other.entry_id = ee_self.entry_id
       AND ee_other.entity_id != ee_self.entity_id
     JOIN entities other ON other.id = ee_other.entity_id
     WHERE ee_self.entity_id = $1
     GROUP BY other.id
     ORDER BY shared_entries DESC
     LIMIT 20`,
    [req.params.id]
  )
  res.json(rows)
})
