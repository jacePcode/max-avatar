const db = require('../config/db')

/**
 * Log an action to the activity feed.
 * Fire-and-forget — never throws, so it never breaks the main request.
 */
const log = async ({ userId, actionType, targetType = null, targetId = null, metadata = {} }) => {
  try {
    await db.query(
      `INSERT INTO activity_feed (user_id, action_type, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, actionType, targetType, targetId, JSON.stringify(metadata)]
    )
  } catch {
    // intentionally silent
  }
}

module.exports = { log }
