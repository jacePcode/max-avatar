const db = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

// ─── Shared filter builder ────────────────────────────────────────────────────
function buildFilters(query) {
  const { type, tag, entity_id, credibility, date_from, date_to, q } = query
  const conditions = ['e.event_date IS NOT NULL']
  const params = []
  let p = 1

  if (type) {
    conditions.push(`e.type = $${p}`)
    params.push(type); p++
  }
  if (credibility) {
    conditions.push(`e.credibility >= $${p}`)
    params.push(Number(credibility)); p++
  }
  if (date_from) {
    conditions.push(`e.event_date >= $${p}`)
    params.push(date_from); p++
  }
  if (date_to) {
    conditions.push(`e.event_date <= $${p}`)
    params.push(date_to); p++
  }
  if (q) {
    conditions.push(`(e.search_vector @@ plainto_tsquery('english', $${p}) OR e.title ILIKE $${p + 1})`)
    params.push(q, `%${q}%`); p += 2
  }

  const joins = []

  if (tag) {
    joins.push(`JOIN entry_tags et_f ON et_f.entry_id = e.id
                JOIN tags t_f ON t_f.id = et_f.tag_id AND t_f.name = $${p}`)
    params.push(tag); p++
  }
  if (entity_id) {
    joins.push(`JOIN entry_entities ee_f ON ee_f.entry_id = e.id AND ee_f.entity_id = $${p}`)
    params.push(entity_id); p++
  }

  return { conditions, joins, params, p }
}

// GET /api/timeline
// Returns all entries with event_date, ordered chronologically
// Supports: type, tag, entity_id, credibility, date_from, date_to, q, limit, offset
exports.list = asyncHandler(async (req, res) => {
  const { limit = 200, offset = 0 } = req.query
  const { conditions, joins, params, p } = buildFilters(req.query)

  const { rows } = await db.query(
    `SELECT e.id, e.title, e.type, e.event_date, e.credibility, e.is_flagged,
            e.ai_summary, e.source_url, e.created_at,
            u.username AS added_by_username,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL), '[]'
            ) AS tags,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', ent.id, 'name', ent.name, 'type', ent.type))
              FILTER (WHERE ent.id IS NOT NULL), '[]'
            ) AS entities
     FROM entries e
     LEFT JOIN users u ON u.id = e.added_by
     LEFT JOIN entry_tags et ON et.entry_id = e.id
     LEFT JOIN tags t ON t.id = et.tag_id
     LEFT JOIN entry_entities ee ON ee.entry_id = e.id
     LEFT JOIN entities ent ON ent.id = ee.entity_id
     ${joins.join('\n')}
     WHERE ${conditions.join(' AND ')}
     GROUP BY e.id, u.username
     ORDER BY e.event_date ASC, e.created_at ASC
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  )
  res.json(rows)
})

// GET /api/timeline/stats
// Returns entry counts grouped by year and month — used for the scrubber
exports.stats = asyncHandler(async (req, res) => {
  const { conditions, joins, params } = buildFilters(req.query)

  // Yearly totals
  const yearRows = await db.query(
    `SELECT DATE_PART('year', e.event_date)::int AS year,
            COUNT(DISTINCT e.id)::int AS count
     FROM entries e
     ${joins.join('\n')}
     WHERE ${conditions.join(' AND ')}
     GROUP BY year
     ORDER BY year ASC`,
    params
  )

  // Monthly breakdown
  const monthRows = await db.query(
    `SELECT DATE_PART('year', e.event_date)::int AS year,
            DATE_PART('month', e.event_date)::int AS month,
            COUNT(DISTINCT e.id)::int AS count
     FROM entries e
     ${joins.join('\n')}
     WHERE ${conditions.join(' AND ')}
     GROUP BY year, month
     ORDER BY year ASC, month ASC`,
    params
  )

  res.json({
    years: yearRows.rows,
    months: monthRows.rows,
  })
})
