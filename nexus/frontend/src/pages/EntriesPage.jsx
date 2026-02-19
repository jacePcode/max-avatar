import { useEffect, useState } from 'react'
import useEntriesStore from '../store/entriesStore'
import EntryCard from '../components/entries/EntryCard'
import EntryFilters from '../components/entries/EntryFilters'
import CreateEntryModal from '../components/entries/CreateEntryModal'
import EntryDetailModal from '../components/entries/EntryDetailModal'

export default function EntriesPage() {
  const { entries, total, loading, fetchEntries } = useEntriesStore()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)

  useEffect(() => { fetchEntries() }, [])

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Entries</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} evidence records`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Entry
        </button>
      </div>

      {/* Filters */}
      <EntryFilters />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-44 animate-pulse bg-surface-800/50" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-5xl mb-4 opacity-20">📂</div>
          <p className="text-gray-400 font-medium">No entries yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Add your first entry to start building the investigation.
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>
            Add first entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateEntryModal onClose={() => setShowCreate(false)} />}
      {selectedEntry && (
        <EntryDetailModal
          entryId={selectedEntry.id}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}
