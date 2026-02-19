import clsx from 'clsx'
import { format, parseISO } from 'date-fns'

const TYPE_CONFIG = {
  url:      { label: 'URL',      dot: 'bg-blue-400',    badge: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  pdf:      { label: 'PDF',      dot: 'bg-red-400',     badge: 'text-red-400 bg-red-400/10 border-red-400/20' },
  image:    { label: 'Image',    dot: 'bg-purple-400',  badge: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  text:     { label: 'Text',     dot: 'bg-gray-400',    badge: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  video:    { label: 'Video',    dot: 'bg-pink-400',    badge: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  audio:    { label: 'Audio',    dot: 'bg-cyan-400',    badge: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  document: { label: 'Doc',      dot: 'bg-green-400',   badge: 'text-green-400 bg-green-400/10 border-green-400/20' },
}

const CRED_COLOR = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']

export default function TimelineEvent({ event, onClick }) {
  const conf = TYPE_CONFIG[event.type] || TYPE_CONFIG.text
  const date = parseISO(event.event_date)

  return (
    <div className="flex gap-0 group">
      {/* Spine: dot + line */}
      <div className="flex flex-col items-center w-10 shrink-0 -mt-0.5">
        <div className={clsx('w-3 h-3 rounded-full border-2 border-surface-800 shrink-0 z-10 mt-1 group-hover:scale-125 transition-transform', conf.dot)} />
        <div className="w-px flex-1 bg-surface-600 mt-1" />
      </div>

      {/* Card */}
      <div
        onClick={onClick}
        className="flex-1 mb-4 pb-0.5 cursor-pointer"
      >
        <div className="card-hover p-3 space-y-2">
          {/* Top row */}
          <div className="flex items-start gap-2 justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={clsx('badge border text-xs', conf.badge)}>{conf.label}</span>
              {event.is_flagged && (
                <span className="badge bg-red-500/10 text-red-400 border border-red-500/20 text-xs">⚑ Flagged</span>
              )}
            </div>
            <span className="text-xs text-amber-400/80 shrink-0 font-mono">
              {format(date, 'MMM d, yyyy')}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2">
            {event.title}
          </h4>

          {/* AI summary */}
          {event.ai_summary && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{event.ai_summary}</p>
          )}

          {/* Tags */}
          {event.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((t) => (
                <span key={t.id} className="badge text-gray-500 bg-surface-700 border border-surface-600 text-xs">
                  {t.name}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="badge text-gray-600 bg-surface-700 border border-surface-600 text-xs">+{event.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Entities */}
          {event.entities?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.entities.slice(0, 3).map((ent) => (
                <span key={ent.id} className="badge text-amber-400/60 bg-amber-400/5 border border-amber-400/10 text-xs">
                  {ent.name}
                </span>
              ))}
              {event.entities.length > 3 && (
                <span className="badge text-gray-600 bg-surface-700 border border-surface-600 text-xs">
                  +{event.entities.length - 3} entities
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{event.added_by_username}</span>
            {event.credibility && (
              <div className="flex items-center gap-0.5" title={`Credibility ${event.credibility}/5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={clsx('w-1.5 h-1.5 rounded-full',
                    i < Number(event.credibility) ? CRED_COLOR[Number(event.credibility)] : 'bg-surface-600'
                  )} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
