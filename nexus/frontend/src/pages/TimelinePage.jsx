import { useEffect, useRef, useState, useMemo } from 'react'
import { format, parseISO, getYear, getMonth } from 'date-fns'
import clsx from 'clsx'
import useTimelineStore from '../store/timelineStore'
import TimelineEvent from '../components/timeline/TimelineEvent'
import YearScrubber from '../components/timeline/YearScrubber'
import EntryDetailModal from '../components/entries/EntryDetailModal'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TYPE_OPTIONS = ['', 'url', 'pdf', 'image', 'text', 'video', 'audio', 'document']

// Group flat sorted events into { year -> { month -> [events] } }
function groupEvents(events) {
  const grouped = {}
  for (const ev of events) {
    const d = parseISO(ev.event_date)
    const y = getYear(d)
    const m = getMonth(d) + 1  // 1-indexed
    if (!grouped[y]) grouped[y] = {}
    if (!grouped[y][m]) grouped[y][m] = []
    grouped[y][m].push(ev)
  }
  return grouped
}

export default function TimelinePage() {
  const { events, stats, loading, filters, setFilter, resetFilters, fetchTimeline } = useTimelineStore()
  const [selectedId, setSelectedId] = useState(null)
  const [activeYear, setActiveYear] = useState(null)
  const yearRefs = useRef({})

  useEffect(() => { fetchTimeline() }, [])

  const grouped = useMemo(() => groupEvents(events), [events])
  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  // Track which year is in view for scrubber highlight
  useEffect(() => {
    if (!sortedYears.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveYear(Number(e.target.dataset.year))
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    sortedYears.forEach((y) => {
      const el = yearRefs.current[y]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sortedYears.join(',')])

  const scrollToYear = (year) => {
    const el = yearRefs.current[year]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveYear(year)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="max-w-screen-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Timeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Loading…'
              : `${events.length.toLocaleString()} dated ${events.length === 1 ? 'event' : 'events'}`}
          </p>
        </div>
        {hasFilters && (
          <button className="btn-ghost text-xs text-gray-400" onClick={resetFilters}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input
          className="input flex-1 min-w-48"
          placeholder="Search events…"
          value={filters.q}
          onChange={(e) => setFilter('q', e.target.value)}
        />
        <select className="input w-36" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All types</option>
          {TYPE_OPTIONS.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select className="input w-36" value={filters.credibility} onChange={(e) => setFilter('credibility', e.target.value)}>
          <option value="">Any credibility</option>
          {[1,2,3,4,5].map((n) => (
            <option key={n} value={n}>≥ {n} star{n !== 1 ? 's' : ''}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input w-36 text-xs"
            value={filters.date_from}
            onChange={(e) => setFilter('date_from', e.target.value)}
            title="From date"
          />
          <span className="text-gray-600 text-xs">→</span>
          <input
            type="date"
            className="input w-36 text-xs"
            value={filters.date_to}
            onChange={(e) => setFilter('date_to', e.target.value)}
            title="To date"
          />
        </div>
      </div>

      {/* Body: scrubber + events */}
      {loading ? (
        <div className="flex gap-6">
          <div className="w-36 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 rounded-lg bg-surface-800 animate-pulse" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-800 animate-pulse" />
            ))}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-5xl mb-4 opacity-20">🕰</div>
          <p className="text-gray-400 font-medium">No dated events found</p>
          <p className="text-gray-600 text-sm mt-1">
            Add an event date to entries to see them on the timeline.
          </p>
          {hasFilters && (
            <button className="btn-secondary mt-4" onClick={resetFilters}>Clear filters</button>
          )}
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Year scrubber */}
          <YearScrubber stats={stats} activeYear={activeYear} onYearClick={scrollToYear} />

          {/* Timeline feed */}
          <div className="flex-1 min-w-0">
            {sortedYears.map((year) => {
              const months = Object.keys(grouped[year]).map(Number).sort((a, b) => a - b)
              const yearCount = Object.values(grouped[year]).reduce((s, evs) => s + evs.length, 0)

              return (
                <section
                  key={year}
                  ref={(el) => { if (el) yearRefs.current[year] = el }}
                  data-year={year}
                  className="mb-8"
                >
                  {/* Year header */}
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-surface-900/95 backdrop-blur-sm py-2 z-10 -mx-1 px-1">
                    <h2 className="text-2xl font-bold text-gray-100 font-mono">{year}</h2>
                    <div className="flex-1 h-px bg-surface-700" />
                    <span className="text-xs text-gray-500 tabular-nums">
                      {yearCount} {yearCount === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {months.map((month) => {
                    const monthEvents = grouped[year][month]
                    return (
                      <div key={month} className="mb-6">
                        {/* Month label */}
                        <div className="flex items-center gap-2 mb-3 ml-10">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/60">
                            {MONTH_NAMES[month - 1]}
                          </h3>
                          <div className="flex-1 h-px bg-surface-800" />
                          <span className="text-xs text-gray-600">{monthEvents.length}</span>
                        </div>

                        {/* Events */}
                        <div>
                          {monthEvents.map((ev, idx) => (
                            <TimelineEvent
                              key={ev.id}
                              event={ev}
                              onClick={() => setSelectedId(ev.id)}
                            />
                          ))}
                          {/* Cap the spine at the last event in month */}
                        </div>
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </div>
      )}

      {selectedId && (
        <EntryDetailModal entryId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
