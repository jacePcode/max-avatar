import { create } from 'zustand'
import api from '../services/api'

const useEntitiesStore = create((set, get) => ({
  entities: [],
  total: 0,
  loading: false,
  filters: { q: '', type: '' },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
    get().fetchEntities()
  },

  fetchEntities: async () => {
    set({ loading: true })
    const { filters } = get()
    const params = {}
    if (filters.q) params.q = filters.q
    if (filters.type) params.type = filters.type
    try {
      const { data } = await api.get('/entities', { params })
      set({ entities: data.entities, total: data.total, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createEntity: async (payload) => {
    const { data } = await api.post('/entities', payload)
    set((s) => ({ entities: [data, ...s.entities], total: s.total + 1 }))
    return data
  },

  updateEntity: async (id, payload) => {
    const { data } = await api.put(`/entities/${id}`, payload)
    set((s) => ({ entities: s.entities.map((e) => (e.id === id ? { ...e, ...data } : e)) }))
    return data
  },

  deleteEntity: async (id) => {
    await api.delete(`/entities/${id}`)
    set((s) => ({ entities: s.entities.filter((e) => e.id !== id), total: s.total - 1 }))
  },
}))

export default useEntitiesStore
