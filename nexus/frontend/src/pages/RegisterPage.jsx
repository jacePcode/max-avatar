import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link as RouterLink } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Account created. Signing you in…')
      await login(form.username, form.password)
      navigate('/entries')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 tracking-wider">NEXUS</h1>
          <p className="text-gray-500 text-sm mt-2">Create your account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Invite code</label>
              <input className="input font-mono" placeholder="XXXXXXXXXXXXXXXX"
                value={form.inviteCode}
                onChange={(e) => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })}
                required />
            </div>
            <div className="divider" />
            <div>
              <label className="label">Username</label>
              <input className="input" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="text-xs text-gray-600 mt-4 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
