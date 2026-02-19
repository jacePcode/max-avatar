import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import useEntriesStore from '../../store/entriesStore'

const TYPES = ['url', 'pdf', 'image', 'text', 'video', 'audio', 'document']

export default function CreateEntryModal({ onClose }) {
  const { createEntry } = useEntriesStore()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    title: '', type: 'url', url: '', content_text: '',
    event_date: '', source_url: '', credibility: '', notes: '', tags: '',
  })

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    // Auto-detect type
    if (f.type === 'application/pdf') setForm((s) => ({ ...s, type: 'pdf' }))
    else if (f.type.startsWith('image/')) setForm((s) => ({ ...s, type: 'image' }))
    else if (f.type.startsWith('video/')) setForm((s) => ({ ...s, type: 'video' }))
    else if (f.type.startsWith('audio/')) setForm((s) => ({ ...s, type: 'audio' }))
    else setForm((s) => ({ ...s, type: 'document' }))
    // Auto-fill title if empty
    if (!form.title) {
      setForm((s) => ({ ...s, title: f.name.replace(/\.[^/.]+$/, '') }))
    }
  }, [form.title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'tags') {
          // Send tags as JSON array
          const tagArr = v.split(',').map((t) => t.trim()).filter(Boolean)
          tagArr.forEach((t) => fd.append('tags[]', t))
        } else if (v) {
          fd.append(k, v)
        }
      })
      if (file) fd.append('file', file)
      await createEntry(fd)
      toast.success('Entry created')
      onClose()
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }

  const needsFile = ['pdf', 'image', 'video', 'audio', 'document'].includes(form.type)
  const needsUrl = form.type === 'url'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-surface-700 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-100">New Entry</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="label">Entry type</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, type: t }))}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    form.type === t
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-surface-700 border-surface-600 text-gray-400 hover:text-gray-200'
                  )}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Brief descriptive title" required
              value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          </div>

          {/* URL */}
          {needsUrl && (
            <div>
              <label className="label">URL *</label>
              <input className="input font-mono text-xs" placeholder="https://…"
                value={form.url} onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))} />
            </div>
          )}

          {/* File drop */}
          {needsFile && (
            <div>
              <label className="label">File</label>
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-amber-400 bg-amber-400/5'
                    : 'border-surface-600 hover:border-surface-500 bg-surface-900/50'
                )}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="text-sm text-gray-300">
                    <span className="text-amber-400">✓</span> {file.name}{' '}
                    <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {isDragActive ? 'Drop it here' : 'Drag & drop a file, or click to browse'}
                    <span className="block text-xs mt-1 text-gray-600">PDF, image, video, audio, doc — up to 50 MB</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Text content */}
          {form.type === 'text' && (
            <div>
              <label className="label">Content</label>
              <textarea className="input min-h-32 resize-y" placeholder="Paste or type content…"
                value={form.content_text}
                onChange={(e) => setForm((s) => ({ ...s, content_text: e.target.value }))} />
            </div>
          )}

          {/* Row: Event date + Credibility */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">Event date</label>
              <input type="date" className="input"
                value={form.event_date}
                onChange={(e) => setForm((s) => ({ ...s, event_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Credibility (1–5)</label>
              <select className="input w-32"
                value={form.credibility}
                onChange={(e) => setForm((s) => ({ ...s, credibility: e.target.value }))}>
                <option value="">Unrated</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
          </div>

          {/* Source URL */}
          <div>
            <label className="label">Source URL</label>
            <input className="input font-mono text-xs" placeholder="Original source link (optional)"
              value={form.source_url}
              onChange={(e) => setForm((s) => ({ ...s, source_url: e.target.value }))} />
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <input className="input" placeholder="flight log, maxwell, 2001 (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-24 resize-y" placeholder="Analyst notes, context, observations…"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Create entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
