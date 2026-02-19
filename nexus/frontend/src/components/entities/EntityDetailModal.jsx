import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useEntitiesStore from '../../store/entitiesStore'
import useAuthStore from '../../store/authStore'
import EntryCard from '../entries/EntryCard'

const REL_TYPES = [
  'associate_of', 'employed_by', 'owns', 'founded', 'member_of',
  'located_at', 'funded_by', 'known_contact', 'parent_of', 'child_of', 'spouse_of', 'other',
]

const REL_COLOR = {
  associate_of: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  employed_by:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  funded_by:    'text-purple-400 bg-purple-400/10 border-purple-400/20',
  owns:         'text-green-400 bg-green-400/10 border-green-400/20',
  founded:      'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
}

export default function EntityDetailModal({ entityId, onClose }) {
  const [entity, setEntity] = useState(null)
  const [linkedEntries, setLinkedEntries] = useState([])
  const [relationships, setRelationships] = useState([])
  const [sharedConnections, setSharedConnections] = useState([])
  const [tab, setTab] = useState('details')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showAddRel, setShowAddRel] = useState(false)
  const [relForm, setRelForm] = useState({ target_id: '', relationship: 'associate_of', label: '' })
  const [relLoading, setRelLoading] = useState(false)
  const { updateEntity, deleteEntity } = useEntitiesStore()
  const { user } = useAuthStore()

  const reload = async () => {
    try {
      const [eRes, entriesRes, relsRes, sharedRes] = await Promise.all([
        api.get(`/entities/${entityId}`),
        api.get(`/entities/${entityId}/entries`),
        api.get(`/entities/${entityId}/relationships`),
        api.get(`/entities/${entityId}/shared-connections`),
      ])
      setEntity(eRes.data)
      setLinkedEntries(entriesRes.data)
      setRelationships(relsRes.data)
      setSharedConnections(sharedRes.data)
      setEditForm({
        name: eRes.data.name,
        description: eRes.data.description || '',
        aliases: eRes.data.aliases?.join(', ') || '',
        roles: eRes.data.roles?.join(', ') || '',
        nationality: eRes.data.nationality || '',
        date_of_birth: eRes.data.date_of_birth?.slice(0, 10) || '',
        date_of_death: eRes.data.date_of_death?.slice(0, 10) || '',
        org_type: eRes.data.org_type || '',
        place_type: eRes.data.place_type || '',
        address: eRes.data.address || '',
        latitude: eRes.data.latitude || '',
        longitude: eRes.data.longitude || '',
      })
    } catch {
      toast.error('Failed to load entity')
      onClose()
    }
  }

  useEffect(() => { reload() }, [entityId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description || undefined,
        aliases: editForm.aliases ? editForm.aliases.split(',').map((a) => a.trim()).filter(Boolean) : undefined,
        roles: editForm.roles ? editForm.roles.split(',').map((r) => r.trim()).filter(Boolean) : undefined,
        nationality: editForm.nationality || undefined,
        date_of_birth: editForm.date_of_birth || undefined,
        date_of_death: editForm.date_of_death || undefined,
        org_type: editForm.org_type || undefined,
        place_type: editForm.place_type || undefined,
        address: editForm.address || undefined,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : undefined,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : undefined,
      }
      const updated = await updateEntity(entityId, payload)
      setEntity(updated)
      setEditing(false)
      toast.success('Entity updated')
    } catch {
      // handled
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${entity.name}" permanently?`)) return
    await deleteEntity(entityId)
    toast.success('Entity deleted')
    onClose()
  }

  const handleAddRelationship = async (e) => {
    e.preventDefault()
    setRelLoading(true)
    try {
      await api.post(`/entities/${entityId}/relationships`, relForm)
      toast.success('Relationship added')
      setShowAddRel(false)
      setRelForm({ target_id: '', relationship: 'associate_of', label: '' })
      reload()
    } catch {
      // handled
    } finally {
      setRelLoading(false)
    }
  }

  const handleRemoveRelationship = async (relId) => {
    if (!confirm('Remove this relationship?')) return
    await api.delete(`/entities/relationships/${relId}`)
    setRelationships((rs) => rs.filter((r) => r.id !== relId))
    toast.success('Relationship removed')
  }

  if (!entity) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative card p-8 animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  const typeIcon = entity.type === 'person' ? '👤' : entity.type === 'organization' ? '🏛' : '📍'
  const initials = entity.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-slide-up">

        {/* Header */}
        <div className="border-b border-surface-700 px-6 py-4 flex items-center gap-4">
          {/* Avatar */}
          {entity.photo_url ? (
            <img src={entity.photo_url} alt={entity.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-surface-600 shrink-0" />
          ) : (
            <div className={clsx(
              'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 shrink-0',
              entity.type === 'person'       ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' :
              entity.type === 'organization' ? 'bg-steel-400/10 border-steel-400/30 text-steel-300' :
                                               'bg-green-400/10 border-green-400/30 text-green-300'
            )}>
              {entity.type === 'location' ? '📍' : entity.type === 'organization' ? '🏛' : initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              <input className="input text-base font-semibold" value={editForm.name}
                onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
            ) : (
              <h2 className="text-lg font-semibold text-gray-100 leading-tight">{entity.name}</h2>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={clsx('badge border text-xs',
                entity.type === 'person'       ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                entity.type === 'organization' ? 'text-steel-400 bg-steel-400/10 border-steel-400/20' :
                                                 'text-green-400 bg-green-400/10 border-green-400/20'
              )}>
                {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
              </span>
              <span className="text-xs text-amber-400/70">
                {entity.entry_count} entr{entity.entry_count === 1 ? 'y' : 'ies'}
              </span>
              {entity.date_of_birth && (
                <span className="text-xs text-gray-500">
                  b. {format(new Date(entity.date_of_birth), 'MMMM d, yyyy')}
                  {entity.date_of_death && ` — d. ${format(new Date(entity.date_of_death), 'MMMM d, yyyy')}`}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-700 px-6">
          {[
            { key: 'details',      label: 'Details' },
            { key: 'entries',      label: `Entries (${linkedEntries.length})` },
            { key: 'connections',  label: `Network (${relationships.length + sharedConnections.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={clsx('px-4 py-3 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors',
                tab === key ? 'border-amber-400 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Details tab */}
          {tab === 'details' && (
            <div className="space-y-5">
              {/* Description */}
              <div>
                <label className="label">Description</label>
                {editing ? (
                  <textarea className="input min-h-24 resize-y"
                    value={editForm.description}
                    onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))} />
                ) : (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {entity.description || <span className="text-gray-600 italic">No description</span>}
                  </p>
                )}
              </div>

              {/* Person fields */}
              {entity.type === 'person' && (
                <>
                  {(entity.aliases?.length > 0 || editing) && (
                    <div>
                      <label className="label">Known aliases</label>
                      {editing ? (
                        <input className="input" placeholder="Alias 1, Alias 2"
                          value={editForm.aliases}
                          onChange={(e) => setEditForm((s) => ({ ...s, aliases: e.target.value }))} />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {entity.aliases?.map((a, i) => (
                            <span key={i} className="badge bg-surface-700 border border-surface-600 text-gray-400">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {(entity.roles?.length > 0 || editing) && (
                    <div>
                      <label className="label">Roles</label>
                      {editing ? (
                        <input className="input" placeholder="Role 1, Role 2"
                          value={editForm.roles}
                          onChange={(e) => setEditForm((s) => ({ ...s, roles: e.target.value }))} />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {entity.roles?.map((r, i) => (
                            <span key={i} className="badge bg-surface-700 border border-surface-600 text-gray-400">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {editing && (
                    <div>
                      <label className="label">Nationality</label>
                      <input className="input" value={editForm.nationality}
                        onChange={(e) => setEditForm((s) => ({ ...s, nationality: e.target.value }))} />
                    </div>
                  )}
                </>
              )}

              {/* Location fields */}
              {entity.type === 'location' && (
                <div className="space-y-3">
                  {entity.address && (
                    <div>
                      <label className="label">Address</label>
                      <p className="text-sm text-gray-300">{entity.address}</p>
                    </div>
                  )}
                  {entity.latitude && entity.longitude && (
                    <div>
                      <label className="label">Coordinates</label>
                      <p className="text-sm font-mono text-gray-400">
                        {entity.latitude}, {entity.longitude}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Edit / action bar */}
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
                  {user?.role === 'admin' && (
                    <button className="btn-danger text-xs ml-auto" onClick={handleDelete}>Delete</button>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-gray-600 space-y-0.5 pt-2">
                <div>Added by <span className="text-gray-500">{entity.added_by_username}</span></div>
                <div>Created <span className="text-gray-500">{format(new Date(entity.created_at), 'PPP')}</span></div>
              </div>
            </div>
          )}

          {/* Entries tab */}
          {tab === 'entries' && (
            <div className="space-y-3">
              {linkedEntries.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-12">
                  No entries linked to this entity yet.
                </p>
              ) : (
                linkedEntries.map((entry) => (
                  <div key={entry.id}>
                    {entry.context && (
                      <p className="text-xs text-gray-500 mb-1 italic">Context: {entry.context}</p>
                    )}
                    <EntryCard entry={entry} onClick={() => {}} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Connections / Network tab */}
          {tab === 'connections' && (
            <div className="space-y-6">
              {/* Direct relationships */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Direct relationships
                  </h3>
                  <button className="btn-ghost text-xs" onClick={() => setShowAddRel(true)}>
                    + Add
                  </button>
                </div>

                {showAddRel && (
                  <form onSubmit={handleAddRelationship} className="card p-4 space-y-3 mb-3">
                    <div>
                      <label className="label">Other entity ID</label>
                      <input className="input font-mono text-xs" placeholder="UUID of entity"
                        required value={relForm.target_id}
                        onChange={(e) => setRelForm((s) => ({ ...s, target_id: e.target.value }))} />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="label">Relationship type</label>
                        <select className="input" value={relForm.relationship}
                          onChange={(e) => setRelForm((s) => ({ ...s, relationship: e.target.value }))}>
                          {REL_TYPES.map((r) => (
                            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="label">Custom label (optional)</label>
                        <input className="input" placeholder="e.g. close friend"
                          value={relForm.label}
                          onChange={(e) => setRelForm((s) => ({ ...s, label: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary text-xs" disabled={relLoading}>
                        {relLoading ? 'Adding…' : 'Add relationship'}
                      </button>
                      <button type="button" className="btn-ghost text-xs" onClick={() => setShowAddRel(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {relationships.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-6">No direct relationships defined.</p>
                ) : (
                  <div className="space-y-2">
                    {relationships.map((rel) => {
                      const isSource = rel.source_id === entityId
                      const otherName = isSource ? rel.target_name : rel.source_name
                      const otherType = isSource ? rel.target_type : rel.source_type
                      const direction = isSource ? '→' : '←'
                      return (
                        <div key={rel.id} className="card p-3 flex items-center gap-3">
                          <span className={clsx('badge border shrink-0',
                            REL_COLOR[rel.relationship] || 'text-gray-400 bg-surface-700 border-surface-600'
                          )}>
                            {(rel.label || rel.relationship).replace(/_/g, ' ')}
                          </span>
                          <span className="text-gray-500 text-xs shrink-0">{direction}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-300 truncate block">{otherName}</span>
                            <span className="text-xs text-gray-600">{otherType}</span>
                          </div>
                          {rel.date_from && (
                            <span className="text-xs text-gray-600 shrink-0">
                              {format(new Date(rel.date_from), 'yyyy')}
                              {rel.date_to ? `–${format(new Date(rel.date_to), 'yyyy')}` : '+'}
                            </span>
                          )}
                          {user?.role !== 'viewer' && (
                            <button className="btn-ghost text-xs text-red-500 shrink-0"
                              onClick={() => handleRemoveRelationship(rel.id)}>
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Shared-entry connections */}
              {sharedConnections.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Co-appears in documents
                  </h3>
                  <div className="space-y-2">
                    {sharedConnections.map((conn) => (
                      <div key={conn.id} className="card p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                          {conn.shared_entries}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-300 block truncate">{conn.name}</span>
                          <span className="text-xs text-gray-600">{conn.type}</span>
                        </div>
                        <div className="text-xs text-gray-600 shrink-0">
                          {conn.shared_entries} shared {conn.shared_entries === 1 ? 'doc' : 'docs'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
