import { useEffect, useState } from 'react'
import useEntitiesStore from '../store/entitiesStore'
import EntityCard from '../components/entities/EntityCard'
import CreateEntityModal from '../components/entities/CreateEntityModal'
import EntityDetailModal from '../components/entities/EntityDetailModal'
import clsx from 'clsx'

const TYPE_TABS = [
  { value: '',             label: 'All' },
  { value: 'person',       label: 'People' },
  { value: 'organization', label: 'Organizations' },
  { value: 'location',     label: 'Locations' },
]

export default function EntitiesPage() {
  const { entities, total, loading, filters, setFilter, fetchEntities } = useEntitiesStore()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => { fetchEntities() }, [])

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Entities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} entities`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Entity
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        {/* Type tabs */}
        <div className="flex gap-1 bg-surface-900 rounded-lg p-1 border border-surface-700">
          {TYPE_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter('type', value)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                filters.type === value
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            className="input"
            placeholder="Search by name, alias, description…"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-surface-800/50" />
          ))}
        </div>
      ) : entities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-5xl mb-4 opacity-20">🕵️</div>
          <p className="text-gray-400 font-medium">No entities yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Add people, organizations, and locations to start mapping connections.
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>
            Add first entity
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {entities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onClick={() => setSelectedId(entity.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEntityModal
          onClose={() => setShowCreate(false)}
        />
      )}
      {selectedId && (
        <EntityDetailModal
          entityId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
