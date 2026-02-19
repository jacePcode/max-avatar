import { create } from 'zustand'
import api from '../services/api'

const useTimelineStore = create((set, get) => ({
  events: [],       // flat array ordered by event_date ASC
  stats: null,      // { years: [...], months: [...] }
  loading: false,
  filters: {
    q: '', type: '', tag: '', entity_id: '', credibility: '',
    date_from: '', date_to: '',
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
    get().fetchTimeline()
  },

  resetFilters: () => {
    set({
      filters: { q: '', type: '', tag: '', entity_id: '', credibility: '', date_from: '', date_to: '' },
    })
    get().fetchTimeline()
  },

  fetchTimeline: async () => {
    set({ loading: true })
    const { filters } = get()
    const params = {}
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    params.limit = 500
    try {
      const [eventsRes, statsRes] = await Promise.all([
        api.get('/timeline', { params }),
        api.get('/timeline/stats', { params }),
      ])
      set({ events: eventsRes.data, stats: statsRes.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))

export default useTimelineStore
