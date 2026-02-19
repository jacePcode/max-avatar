import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || 'Something went wrong'
    if (err.response?.status === 401) {
      localStorage.removeItem('nexus_token')
      window.location.href = '/login'
    } else if (err.response?.status !== 404) {
      toast.error(message)
    }
    return Promise.reject(err)
  }
)

export default api
