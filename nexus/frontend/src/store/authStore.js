import { create } from 'zustand'
import api from '../services/api'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('nexus_token') || null,
  loading: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('nexus_token', data.token)
      set({ user: data.user, token: data.token, loading: false })
      return data
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('nexus_token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data })
    } catch {
      localStorage.removeItem('nexus_token')
      set({ user: null, token: null })
    }
  },
}))

export default useAuthStore
