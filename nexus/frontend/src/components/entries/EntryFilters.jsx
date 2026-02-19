import useEntriesStore from '../../store/entriesStore'

const TYPES = ['url', 'pdf', 'image', 'text', 'video', 'audio', 'document']

export default function EntryFilters() {
  const { filters, setFilter, resetFilters } = useEntriesStore()
  const hasFilters = Object.entries(filters)
    .some(([k, v]) => v && !['sort', 'order'].includes(k))

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Search entries…"
            value={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
          />
        </div>

        {/* Type filter */}
        <div>
          <label className="label">Type</label>
          <select
            className="input w-36"
            value={filters.type}
            onChange={(e) => setFilter('type', e.target.value)}
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Credibility */}
        <div>
          <label className="label">Credibility</label>
          <select
            className="input w-36"
            value={filters.credibility}
            onChange={(e) => setFilter('credibility', e.target.value)}
          >
            <option value="">Any</option>
            {[1,2,3,4,5].map((n) => (
              <option key={n} value={String(n)}>{n} star{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="label">Event from</label>
          <input type="date" className="input w-40"
            value={filters.dateFrom}
            onChange={(e) => setFilter('dateFrom', e.target.value)} />
        </div>

        {/* Date to */}
        <div>
          <label className="label">Event to</label>
          <input type="date" className="input w-40"
            value={filters.dateTo}
            onChange={(e) => setFilter('dateTo', e.target.value)} />
        </div>

        {/* Sort */}
        <div>
          <label className="label">Sort by</label>
          <select className="input w-40"
            value={`${filters.sort}:${filters.order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(':')
              setFilter('sort', s)
              setFilter('order', o)
            }}>
            <option value="created_at:desc">Added (newest)</option>
            <option value="created_at:asc">Added (oldest)</option>
            <option value="event_date:desc">Event date (newest)</option>
            <option value="event_date:asc">Event date (oldest)</option>
            <option value="title:asc">Title A–Z</option>
            <option value="credibility:desc">Credibility</option>
          </select>
        </div>

        {hasFilters && (
          <button className="btn-ghost text-xs" onClick={resetFilters}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
