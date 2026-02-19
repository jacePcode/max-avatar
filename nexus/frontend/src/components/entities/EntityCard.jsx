import clsx from 'clsx'
import { format } from 'date-fns'

const TYPE_CONFIG = {
  person:       { label: 'Person',       color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',   icon: '👤' },
  organization: { label: 'Organization', color: 'text-steel-400 bg-steel-400/10 border-steel-400/20',   icon: '🏛️' },
  location:     { label: 'Location',     color: 'text-green-400 bg-green-400/10 border-green-400/20',   icon: '📍' },
}

export default function EntityCard({ entity, onClick }) {
  const conf = TYPE_CONFIG[entity.type] || TYPE_CONFIG.person
  const initials = entity.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div onClick={onClick} className="card-hover p-4 flex gap-4 animate-fade-in">
      {/* Avatar / photo */}
      <div className="shrink-0">
        {entity.photo_url ? (
          <img
            src={entity.photo_url}
            alt={entity.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-surface-600"
          />
        ) : (
          <div className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2',
            entity.type === 'person'       ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' :
            entity.type === 'organization' ? 'bg-steel-400/10 border-steel-400/30 text-steel-300' :
                                             'bg-green-400/10 border-green-400/30 text-green-300'
          )}>
            {entity.type === 'location' ? '📍' : entity.type === 'organization' ? '🏛' : initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-100 leading-snug truncate">
            {entity.name}
          </h3>
          <span className={clsx('badge border shrink-0', conf.color)}>
            {conf.label}
          </span>
        </div>

        {/* Aliases */}
        {entity.aliases?.length > 0 && (
          <p className="text-xs text-gray-500 italic truncate">
            aka {entity.aliases.slice(0, 3).join(', ')}
          </p>
        )}

        {/* Roles / org type / place type */}
        {entity.roles?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entity.roles.slice(0, 3).map((r, i) => (
              <span key={i} className="badge bg-surface-700 border border-surface-600 text-gray-400">
                {r}
              </span>
            ))}
          </div>
        )}
        {entity.org_type && (
          <span className="badge bg-surface-700 border border-surface-600 text-gray-400">
            {entity.org_type}
          </span>
        )}
        {entity.place_type && (
          <span className="badge bg-surface-700 border border-surface-600 text-gray-400">
            {entity.place_type}
          </span>
        )}

        {/* Description preview */}
        {entity.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {entity.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-surface-700 text-xs text-gray-600">
          <span>
            {entity.entry_count > 0
              ? <span className="text-amber-400/70">{entity.entry_count} entr{entity.entry_count === 1 ? 'y' : 'ies'}</span>
              : 'No entries linked'}
          </span>
          {entity.date_of_birth && (
            <span>b. {format(new Date(entity.date_of_birth), 'yyyy')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
