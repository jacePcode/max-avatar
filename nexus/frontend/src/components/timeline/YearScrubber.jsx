import clsx from 'clsx'

export default function YearScrubber({ stats, activeYear, onYearClick }) {
  if (!stats?.years?.length) return null

  const maxCount = Math.max(...stats.years.map((y) => y.count))

  return (
    <aside className="w-36 shrink-0 sticky top-0 self-start max-h-screen overflow-y-auto py-2 pr-2 hide-scrollbar">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3 px-2">Years</p>
      <div className="space-y-0.5">
        {stats.years.map(({ year, count }) => {
          const barWidth = maxCount > 0 ? Math.max(8, (count / maxCount) * 100) : 8
          const isActive = year === activeYear
          return (
            <button
              key={year}
              onClick={() => onYearClick(year)}
              className={clsx(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group',
                isActive
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-surface-700/50'
              )}
            >
              <span className="font-mono text-xs font-semibold w-10 shrink-0">{year}</span>
              <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all',
                    isActive ? 'bg-amber-400' : 'bg-surface-500 group-hover:bg-surface-400'
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className={clsx('text-xs w-6 text-right tabular-nums',
                isActive ? 'text-amber-400' : 'text-gray-600'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
