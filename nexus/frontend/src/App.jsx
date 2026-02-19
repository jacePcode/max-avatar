import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AppShell from './components/common/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EntriesPage from './pages/EntriesPage'
import EntitiesPage from './pages/EntitiesPage'
import TimelinePage from './pages/TimelinePage'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AuthRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/entries" replace />
  return children
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="entries" element={<EntriesPage />} />
                <Route path="/" element={<Navigate to="/entries" replace />} />
                <Route path="entities" element={<EntitiesPage />} />
                {/* Placeholder routes for future modules */}
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="graph"    element={<ComingSoon title="Connection Graph" />} />
                <Route path="map"      element={<ComingSoon title="Map View" />} />
                <Route path="search"   element={<ComingSoon title="Search" />} />
                <Route path="ai"       element={<ComingSoon title="AI Analysis" />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-32">
      <div className="text-4xl mb-4">🔮</div>
      <h2 className="text-2xl font-semibold text-gray-200 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm">This module is coming in the next phase.</p>
    </div>
  )
}
