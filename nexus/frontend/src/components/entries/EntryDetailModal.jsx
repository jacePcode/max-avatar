import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useEntriesStore from '../../store/entriesStore'
import useAuthStore from '../../store/authStore'

const CREDIBILITY_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
const CONN_TYPES = ['linked_to', 'contradicts', 'confirms', 'preceded', 'funded_by', 'associate_of', 'present_at']

export default function EntryDetailModal({ entryId, onClose }) {
  const [entry, setEntry] = useState(null)
  const [connections, setConnections] = useState([])
  const [tab, setTab] = useState('details')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const { updateEntry, flagEntry, deleteEntry } = useEntriesStore()
  const { user } = useAuthStore()

  useEffect(() => {
    const load = async () => {
      try {
        const [entryRes, connRes] = await Promise.all([
          api.get(`/entries/${entryId}`),
          api.get(`/entries/${entryId}/connections`),
        ])
        setEntry(entryRes.data)
        setConnections(connRes.data)
        setEditForm({
          title: entryRes.data.title,
          notes: entryRes.data.notes || '',
          credibility: entryRes.data.credibility || '',
          event_date: entryRes.data.event_date ? entryRes.data.event_date.slice(0, 10) : '',
          tags: entryRes.data.tags?.map((t) => t.name).join(', ') || '',
        })
      } catch {
        toast.error('Failed to load entry')
        onClose()
      }
    }
    load()
  }, [entryId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      const updated = await updateEntry(entryId, payload)
      setEntry(updated)
      setEditing(false)
      toast.success('Entry updated')
    } catch {
      // handled
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this entry permanently?')) return
    await deleteEntry(entryId)
    toast.success('Entry deleted')
    onClose()
  }

  if (!entry) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative card p-8 animate-pulse text-gray-500">Loading entry…</div>
      </div>
    )
  }

  const fileUrl = entry.file_path
    ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}/files/${entry.file_path}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-slide-up">

        {/* Header */}
        <div className="border-b border-surface-700 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input className="input text-base font-semibold" value={editForm.title}
                onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))} />
            ) : (
              <h2 className="text-base font-semibold text-gray-100 leading-snug">
                {entry.title}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="badge bg-surface-700 border border-surface-600 text-gray-400">
                {entry.type.toUpperCase()}
              </span>
              {entry.is_flagged && (
                <span className="badge bg-red-500/10 border border-red-500/20 text-red-400">⚑ Flagged</span>
              )}
              {entry.event_date && (
                <span className="text-xs text-amber-400">
                  {format(new Date(entry.event_date), 'MMMM d, yyyy')}
                </span>
              )}
              {entry.credibility && (
                <div className="flex gap-0.5" title={`Credibility: ${entry.credibility}/5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={clsx('w-1.5 h-1.5 rounded-full',
                      i < Number(entry.credibility) ? CREDIBILITY_COLORS[Number(entry.credibility)] : 'bg-surface-600'
                    )} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-700 px-6">
          {['details', 'document', 'connections'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-4 py-3 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors',
                tab === t ? 'border-amber-400 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
              )}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Details tab */}
          {tab === 'details' && (
            <div className="space-y-5">
              {/* AI Summary */}
              {entry.ai_summary && (
                <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">AI Summary</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{entry.ai_summary}</p>
                </div>
              )}

              {/* URL */}
              {entry.url && (
                <div>
                  <label className="label">URL</label>
                  <a href={entry.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 break-all transition-colors"
                    onClick={(e) => e.stopPropagation()}>
                    {entry.url}
                  </a>
                </div>
              )}

              {/* Content text */}
              {entry.content_text && (
                <div>
                  <label className="label">Content</label>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.content_text}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                {editing ? (
                  <textarea className="input min-h-28 resize-y"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((s) => ({ ...s, notes: e.target.value }))} />
                ) : (
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {entry.notes || <span className="text-gray-600 italic">No notes</span>}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="label">Tags</label>
                {editing ? (
                  <input className="input" placeholder="tag1, tag2, tag3"
                    value={editForm.tags}
                    onChange={(e) => setEditForm((s) => ({ ...s, tags: e.target.value }))} />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.tags?.length > 0
                      ? entry.tags.map((tag) => (
                          <span key={tag.id} className="badge bg-surface-700 border border-surface-600 text-gray-400">
                            {tag.name}
                          </span>
                        ))
                      : <span className="text-gray-600 text-sm italic">No tags</span>
                    }
                  </div>
                )}
              </div>

              {/* Entities */}
              {entry.entities?.length > 0 && (
                <div>
                  <label className="label">Linked entities</label>
                  <div className="flex flex-wrap gap-2">
                    {entry.entities.map((en) => (
                      <span key={en.id} className="badge bg-steel-900/50 border border-steel-700/50 text-steel-400">
                        {en.name} <span className="text-gray-600 ml-1">({en.type})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit controls */}
              {editing ? (
                <div className="flex gap-3">
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-surface-700">
                  <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>Edit</button>
                  <button className="btn-ghost text-xs"
                    onClick={() => flagEntry(entry.id, 'Marked for review')}>
                    ⚑ Flag
                  </button>
                  {user?.role === 'admin' && (
                    <button className="btn-danger text-xs ml-auto" onClick={handleDelete}>Delete</button>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-gray-600 space-y-0.5 pt-2">
                <div>Added by <span className="text-gray-500">{entry.added_by_username}</span></div>
                <div>Created <span className="text-gray-500">{format(new Date(entry.created_at), 'PPP p')}</span></div>
                {entry.ai_processed_at && (
                  <div>AI processed <span className="text-gray-500">{format(new Date(entry.ai_processed_at), 'PPP p')}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Document tab */}
          {tab === 'document' && (
            <div>
              {entry.type === 'pdf' && fileUrl ? (
                <iframe src={fileUrl} className="w-full h-[60vh] rounded-lg border border-surface-700" title="Document viewer" />
              ) : entry.type === 'image' && fileUrl ? (
                <img src={fileUrl} alt={entry.title} className="max-w-full rounded-lg border border-surface-700" />
              ) : entry.url ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm mb-3">External URL — open in new tab</p>
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block">
                    Open source →
                  </a>
                </div>
              ) : (
                <p className="text-gray-600 text-sm text-center py-12">No document to display.</p>
              )}
            </div>
          )}

          {/* Connections tab */}
          {tab === 'connections' && (
            <div className="space-y-3">
              {connections.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-12">No connections yet.</p>
              ) : (
                connections.map((conn) => {
                  const other = conn.source_id === entryId ? conn.target_title : conn.source_title
                  const direction = conn.source_id === entryId ? '→' : '←'
                  return (
                    <div key={conn.id} className="card p-3 flex items-center gap-3">
                      <span className={clsx('badge border shrink-0', getConnColor(conn.type))}>
                        {conn.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-500 text-xs shrink-0">{direction}</span>
                      <span className="text-sm text-gray-300 truncate">{other}</span>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getConnColor(type) {
  const map = {
    contradicts: 'text-red-400 bg-red-400/10 border-red-400/20',
    confirms: 'text-green-400 bg-green-400/10 border-green-400/20',
    funded_by: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    present_at: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  }
  return map[type] || 'text-gray-400 bg-surface-700 border-surface-600'
}
