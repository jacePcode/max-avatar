import clsx from 'clsx'
import { format } from 'date-fns'

const TYPE_CONFIG = {
  url:      { label: 'URL',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  pdf:      { label: 'PDF',      color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  image:    { label: 'Image',    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  text:     { label: 'Text',     color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  video:    { label: 'Video',    color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  audio:    { label: 'Audio',    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  document: { label: 'Doc',      color: 'text-green-400 bg-green-400/10 border-green-400/20' },
}

const CREDIBILITY_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']

export default function EntryCard({ entry, onClick }) {
  const typeConf = TYPE_CONFIG[entry.type] || TYPE_CONFIG.text

  return (
    <div
      onClick={onClick}
      className="card-hover p-4 flex flex-col gap-3 animate-fade-in"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className={clsx('badge border', typeConf.color)}>
          {typeConf.label}
        </span>
        <div className="flex items-center gap-1.5">
          {entry.credibility && (
            <div className="flex items-center gap-0.5" title={`Credibility: ${entry.credibility}/5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full',
                    i < Number(entry.credibility) ? CREDIBILITY_COLORS[Number(entry.credibility)] : 'bg-surface-600'
                  )}
                />
              ))}
            </div>
          )}
          {entry.is_flagged && (
            <span className="badge bg-red-500/10 text-red-400 border border-red-500/20" title={entry.flag_reason}>
              ⚑ Flagged
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2">
        {entry.title}
      </h3>

      {/* AI Summary */}
      {entry.ai_summary && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
          {entry.ai_summary}
        </p>
      )}

      {/* Tags */}
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.slice(0, 4).map((tag) => (
            <span
              key={tag.id}
              className="badge text-gray-400 bg-surface-700 border border-surface-600"
            >
              {tag.name}
            </span>
          ))}
          {entry.tags.length > 4 && (
            <span className="badge text-gray-500 bg-surface-700 border border-surface-600">
              +{entry.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-700 text-xs text-gray-500">
        <span>{entry.added_by_username}</span>
        <div className="flex items-center gap-2">
          {entry.event_date && (
            <span className="text-amber-400/70">
              {format(new Date(entry.event_date), 'MMM d, yyyy')}
            </span>
          )}
          <span>{format(new Date(entry.created_at), 'MMM d')}</span>
        </div>
      </div>
    </div>
  )
}
