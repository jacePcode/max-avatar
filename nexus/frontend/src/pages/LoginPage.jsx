import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const { login, loading } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(form.username, form.password)
      toast.success('Welcome back.')
    } catch {
      // error toast handled by api interceptor
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 tracking-wider">NEXUS</h1>
          <p className="text-gray-500 text-sm mt-2">Collaborative Investigation Platform</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-200 mb-1">Sign in</h2>
          <p className="text-xs text-gray-500 mb-6">Access is invite-only.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username or email</label>
              <input
                className="input"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-600 mt-4 text-center">
            Have an invite code?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
