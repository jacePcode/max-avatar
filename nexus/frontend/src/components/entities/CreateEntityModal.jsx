import { useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import useEntitiesStore from '../../store/entitiesStore'

const TYPES = [
  { value: 'person',       label: 'Person',       desc: 'Individual — real or identified' },
  { value: 'organization', label: 'Organization',  desc: 'Corporation, NGO, network, etc.' },
  { value: 'location',     label: 'Location',      desc: 'Property, island, city, address' },
]

const REL_TYPES = [
  'associate_of', 'employed_by', 'owns', 'founded', 'member_of',
  'located_at', 'funded_by', 'known_contact', 'other',
]

export default function CreateEntityModal({ onClose }) {
  const { createEntity } = useEntitiesStore()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('person')
  const [form, setForm] = useState({
    name: '', description: '', photo_url: '',
    // person
    aliases: '', date_of_birth: '', date_of_death: '', nationality: '', roles: '',
    // org
    org_type: '', founded_date: '', dissolved_date: '',
    // location
    latitude: '', longitude: '', address: '', place_type: '',
  })

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        type,
        name: form.name,
        description: form.description || undefined,
        photo_url: form.photo_url || undefined,
      }
      if (type === 'person') {
        Object.assign(payload, {
          aliases: form.aliases ? form.aliases.split(',').map((a) => a.trim()).filter(Boolean) : undefined,
          date_of_birth: form.date_of_birth || undefined,
          date_of_death: form.date_of_death || undefined,
          nationality: form.nationality || undefined,
          roles: form.roles ? form.roles.split(',').map((r) => r.trim()).filter(Boolean) : undefined,
        })
      } else if (type === 'organization') {
        Object.assign(payload, {
          org_type: form.org_type || undefined,
          founded_date: form.founded_date || undefined,
          dissolved_date: form.dissolved_date || undefined,
        })
      } else {
        Object.assign(payload, {
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
          address: form.address || undefined,
          place_type: form.place_type || undefined,
        })
      }
      await createEntity(payload)
      toast.success('Entity created')
      onClose()
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-surface-700 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-100">New Entity</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="label">Entity type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={clsx(
                    'p-3 rounded-xl border text-left transition-all',
                    type === value
                      ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
                      : 'border-surface-600 bg-surface-900/50 text-gray-400 hover:border-surface-500'
                  )}
                >
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label">Full name *</label>
            <input className="input" required placeholder="Full legal name or organization name"
              value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-20 resize-y"
              placeholder="Brief background, role in the investigation…"
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Person-specific fields */}
          {type === 'person' && (
            <>
              <div>
                <label className="label">Aliases / known names</label>
                <input className="input" placeholder="Jeffrey E. Epstein, Jeff Epstein (comma-separated)"
                  value={form.aliases} onChange={(e) => set('aliases', e.target.value)} />
              </div>
              <div>
                <label className="label">Roles</label>
                <input className="input" placeholder="Financier, Convicted sex offender (comma-separated)"
                  value={form.roles} onChange={(e) => set('roles', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Date of birth</label>
                  <input type="date" className="input"
                    value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="label">Date of death</label>
                  <input type="date" className="input"
                    value={form.date_of_death} onChange={(e) => set('date_of_death', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Nationality</label>
                <input className="input" placeholder="American"
                  value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
              </div>
              <div>
                <label className="label">Photo URL</label>
                <input className="input font-mono text-xs" placeholder="https://…"
                  value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} />
              </div>
            </>
          )}

          {/* Organization-specific */}
          {type === 'organization' && (
            <>
              <div>
                <label className="label">Organization type</label>
                <input className="input" placeholder="e.g. Corporation, NGO, Foundation, Government"
                  value={form.org_type} onChange={(e) => set('org_type', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Founded</label>
                  <input type="date" className="input"
                    value={form.founded_date} onChange={(e) => set('founded_date', e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="label">Dissolved</label>
                  <input type="date" className="input"
                    value={form.dissolved_date} onChange={(e) => set('dissolved_date', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Location-specific */}
          {type === 'location' && (
            <>
              <div>
                <label className="label">Place type</label>
                <input className="input" placeholder="e.g. Island, Residence, Office, Airport"
                  value={form.place_type} onChange={(e) => set('place_type', e.target.value)} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" placeholder="Street address or general description"
                  value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Latitude</label>
                  <input type="number" step="any" className="input font-mono"
                    placeholder="18.3419"
                    value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="label">Longitude</label>
                  <input type="number" step="any" className="input font-mono"
                    placeholder="-64.8963"
                    value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
