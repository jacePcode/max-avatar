import { create } from 'zustand'
import api from '../services/api'

const useEntriesStore = create((set, get) => ({
  entries: [],
  total: 0,
  loading: false,
  filters: {
    q: '', type: '', tag: '', credibility: '',
    dateFrom: '', dateTo: '', sort: 'created_at', order: 'desc',
  },
  offset: 0,
  limit: 50,

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value }, offset: 0 }))
    get().fetchEntries()
  },

  resetFilters: () => {
    set({
      filters: { q: '', type: '', tag: '', credibility: '', dateFrom: '', dateTo: '', sort: 'created_at', order: 'desc' },
      offset: 0,
    })
    get().fetchEntries()
  },

  fetchEntries: async () => {
    set({ loading: true })
    const { filters, offset, limit } = get()
    const params = { ...filters, offset, limit }
    // Remove empty params
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
    try {
      const { data } = await api.get('/entries', { params })
      set({ entries: data.entries, total: data.total, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createEntry: async (formData) => {
    const { data } = await api.post('/entries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    set((s) => ({ entries: [data, ...s.entries], total: s.total + 1 }))
    return data
  },

  updateEntry: async (id, payload) => {
    const { data } = await api.put(`/entries/${id}`, payload)
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }))
    return data
  },

  deleteEntry: async (id) => {
    await api.delete(`/entries/${id}`)
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      total: s.total - 1,
    }))
  },

  flagEntry: async (id, reason) => {
    const { data } = await api.post(`/entries/${id}/flag`, { reason })
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }))
  },
}))

export default useEntriesStore
