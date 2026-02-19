const db = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')
const activity = require('../services/activity.service')
const path = require('path')
const fs = require('fs')

// ─── Helper: fetch full entry with tags + entities ────────────────────────────
const fetchEntry = async (id) => {
  const { rows } = await db.query(
    `SELECT e.*,
            u.username AS added_by_username,
            u.display_name AS added_by_display_name,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL), '[]'
            ) AS tags,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object(
                'id', en.id, 'name', en.name, 'type', en.type, 'context', ee.context
              )) FILTER (WHERE en.id IS NOT NULL), '[]'
            ) AS entities
     FROM entries e
     LEFT JOIN users u ON u.id = e.added_by
     LEFT JOIN entry_tags et ON et.entry_id = e.id
     LEFT JOIN tags t ON t.id = et.tag_id
     LEFT JOIN entry_entities ee ON ee.entry_id = e.id
     LEFT JOIN entities en ON en.id = ee.entity_id
     WHERE e.id = $1
     GROUP BY e.id, u.username, u.display_name`,
    [id]
  )
  return rows[0] || null
}

// GET /api/entries
exports.list = asyncHandler(async (req, res) => {
  const {
    q, type, tag, entity, credibility,
    dateFrom, dateTo, addedBy, flagged,
    limit = 50, offset = 0, sort = 'created_at', order = 'desc',
  } = req.query

  const conditions = []
  const params = []
  let p = 1

  if (q) {
    conditions.push(`e.search_vector @@ plainto_tsquery('english', $${p})`)
    params.push(q); p++
  }
  if (type) {
    conditions.push(`e.type = $${p}`)
    params.push(type); p++
  }
  if (credibility) {
    conditions.push(`e.credibility = $${p}`)
    params.push(credibility); p++
  }
  if (dateFrom) {
    conditions.push(`e.event_date >= $${p}`)
    params.push(dateFrom); p++
  }
  if (dateTo) {
    conditions.push(`e.event_date <= $${p}`)
    params.push(dateTo); p++
  }
  if (addedBy) {
    conditions.push(`e.added_by = $${p}`)
    params.push(addedBy); p++
  }
  if (flagged === 'true') {
    conditions.push(`e.is_flagged = true`)
  }
  if (tag) {
    conditions.push(
      `EXISTS (SELECT 1 FROM entry_tags et2 JOIN tags t2 ON t2.id = et2.tag_id
               WHERE et2.entry_id = e.id AND t2.name = $${p})`
    )
    params.push(tag); p++
  }
  if (entity) {
    conditions.push(
      `EXISTS (SELECT 1 FROM entry_entities ee2 WHERE ee2.entry_id = e.id AND ee2.entity_id = $${p})`
    )
    params.push(entity); p++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const allowedSorts = ['created_at', 'event_date', 'title', 'credibility', 'updated_at']
  const sortCol = allowedSorts.includes(sort) ? sort : 'created_at'
  const sortDir = order === 'asc' ? 'ASC' : 'DESC'

  const { rows } = await db.query(
    `SELECT e.id, e.title, e.type, e.url, e.file_name, e.event_date,
            e.credibility, e.is_flagged, e.ai_summary, e.created_at, e.updated_at,
            u.username AS added_by_username,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL), '[]'
            ) AS tags
     FROM entries e
     LEFT JOIN users u ON u.id = e.added_by
     LEFT JOIN entry_tags et ON et.entry_id = e.id
     LEFT JOIN tags t ON t.id = et.tag_id
     ${where}
     GROUP BY e.id, u.username
     ORDER BY e.${sortCol} ${sortDir} NULLS LAST
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  )

  const { rows: countRows } = await db.query(
    `SELECT COUNT(DISTINCT e.id) AS total FROM entries e
     LEFT JOIN entry_tags et ON et.entry_id = e.id
     LEFT JOIN tags t ON t.id = et.tag_id
     ${where}`,
    params
  )

  res.json({ entries: rows, total: parseInt(countRows[0].total, 10) })
})

// POST /api/entries
exports.create = asyncHandler(async (req, res) => {
  const {
    title, type, url, content_text, event_date,
    source_url, credibility, notes, tags = [],
  } = req.body

  if (!title || !type) {
    return res.status(400).json({ error: 'title and type are required' })
  }

  let file_path = null, file_name = null, file_size_bytes = null, mime_type = null
  if (req.file) {
    file_path = req.file.filename
    file_name = req.file.originalname
    file_size_bytes = req.file.size
    mime_type = req.file.mimetype
  }

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO entries
         (title, type, url, file_path, file_name, file_size_bytes, mime_type,
          content_text, event_date, source_url, credibility, notes, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [title, type, url || null, file_path, file_name, file_size_bytes, mime_type,
       content_text || null, event_date || null, source_url || null,
       credibility || null, notes || null, req.user.id]
    )
    const entry = rows[0]

    // Save version snapshot
    await client.query(
      `INSERT INTO entry_versions (entry_id, version_num, snapshot, changed_by, change_note)
       VALUES ($1, 1, $2, $3, 'Initial creation')`,
      [entry.id, JSON.stringify(entry), req.user.id]
    )

    // Attach tags (create new ones on the fly if needed)
    for (const tagName of tags) {
      const { rows: tagRows } = await client.query(
        `INSERT INTO tags (name, created_by) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [tagName.trim().toLowerCase(), req.user.id]
      )
      await client.query(
        'INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [entry.id, tagRows[0].id]
      )
    }

    await client.query('COMMIT')

    activity.log({
      userId: req.user.id,
      actionType: 'entry.created',
      targetType: 'entry',
      targetId: entry.id,
      metadata: { title: entry.title, type: entry.type },
    })

    const full = await fetchEntry(entry.id)
    res.status(201).json(full)
  } catch (err) {
    await client.query('ROLLBACK')
    // Clean up uploaded file if DB insert failed
    if (file_path) {
      const uploadDir = process.env.UPLOAD_DIR || './uploads'
      fs.unlink(path.join(uploadDir, file_path), () => {})
    }
    throw err
  } finally {
    client.release()
  }
})

// GET /api/entries/:id
exports.get = asyncHandler(async (req, res) => {
  const entry = await fetchEntry(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Entry not found' })
  res.json(entry)
})

// PUT /api/entries/:id
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await fetchEntry(id)
  if (!existing) return res.status(404).json({ error: 'Entry not found' })

  const {
    title, url, content_text, event_date, source_url,
    credibility, notes, tags,
  } = req.body

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `UPDATE entries SET
         title = COALESCE($1, title),
         url = COALESCE($2, url),
         content_text = COALESCE($3, content_text),
         event_date = COALESCE($4, event_date),
         source_url = COALESCE($5, source_url),
         credibility = COALESCE($6, credibility),
         notes = COALESCE($7, notes),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, url, content_text, event_date, source_url, credibility, notes, id]
    )
    const entry = rows[0]

    // Save version
    const { rows: vRows } = await client.query(
      'SELECT MAX(version_num) AS max FROM entry_versions WHERE entry_id = $1', [id]
    )
    await client.query(
      `INSERT INTO entry_versions (entry_id, version_num, snapshot, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [id, (vRows[0].max || 0) + 1, JSON.stringify(entry), req.user.id]
    )

    // Re-sync tags if provided
    if (Array.isArray(tags)) {
      await client.query('DELETE FROM entry_tags WHERE entry_id = $1', [id])
      for (const tagName of tags) {
        const { rows: tagRows } = await client.query(
          `INSERT INTO tags (name, created_by) VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [tagName.trim().toLowerCase(), req.user.id]
        )
        await client.query(
          'INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagRows[0].id]
        )
      }
    }

    await client.query('COMMIT')

    activity.log({
      userId: req.user.id,
      actionType: 'entry.updated',
      targetType: 'entry',
      targetId: id,
      metadata: { title: entry.title },
    })

    const full = await fetchEntry(id)
    res.json(full)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/entries/:id  (admin only)
exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rows } = await db.query('SELECT file_path FROM entries WHERE id = $1', [id])
  if (!rows[0]) return res.status(404).json({ error: 'Entry not found' })

  // Delete uploaded file if it exists
  if (rows[0].file_path) {
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    fs.unlink(path.join(uploadDir, rows[0].file_path), () => {})
  }

  await db.query('DELETE FROM entries WHERE id = $1', [id])
  activity.log({
    userId: req.user.id,
    actionType: 'entry.deleted',
    targetType: 'entry',
    targetId: id,
  })
  res.status(204).send()
})

// POST /api/entries/:id/flag
exports.flag = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  const { rows } = await db.query(
    `UPDATE entries SET is_flagged = true, flag_reason = $1 WHERE id = $2 RETURNING id, is_flagged, flag_reason`,
    [reason || null, id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Entry not found' })
  activity.log({
    userId: req.user.id, actionType: 'entry.flagged', targetType: 'entry', targetId: id,
  })
  res.json(rows[0])
})

// POST /api/entries/:id/unflag
exports.unflag = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rows } = await db.query(
    `UPDATE entries SET is_flagged = false, flag_reason = NULL WHERE id = $1 RETURNING id, is_flagged`,
    [id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Entry not found' })
  res.json(rows[0])
})

// GET /api/entries/:id/versions
exports.getVersions = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ev.id, ev.version_num, ev.change_note, ev.created_at,
            u.username AS changed_by_username
     FROM entry_versions ev
     LEFT JOIN users u ON u.id = ev.changed_by
     WHERE ev.entry_id = $1
     ORDER BY ev.version_num DESC`,
    [req.params.id]
  )
  res.json(rows)
})

// GET /api/entries/:id/connections
exports.getConnections = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ec.*,
            e_src.title AS source_title, e_tgt.title AS target_title,
            u.username AS created_by_username
     FROM entry_connections ec
     JOIN entries e_src ON e_src.id = ec.source_id
     JOIN entries e_tgt ON e_tgt.id = ec.target_id
     LEFT JOIN users u ON u.id = ec.created_by
     WHERE ec.source_id = $1 OR ec.target_id = $1
     ORDER BY ec.created_at DESC`,
    [req.params.id]
  )
  res.json(rows)
})

// POST /api/entries/:id/connections
exports.addConnection = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { target_id, type = 'linked_to', label, description, strength } = req.body
  if (!target_id) return res.status(400).json({ error: 'target_id is required' })
  if (id === target_id) return res.status(400).json({ error: 'Cannot connect entry to itself' })

  const { rows } = await db.query(
    `INSERT INTO entry_connections (source_id, target_id, type, label, description, strength, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id, target_id, type, label || null, description || null, strength || 1, req.user.id]
  )
  activity.log({
    userId: req.user.id, actionType: 'connection.added', targetType: 'entry', targetId: id,
    metadata: { target_id, type },
  })
  res.status(201).json(rows[0])
})
