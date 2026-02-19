import useAuthStore from '../../store/authStore'

export default function TopBar() {
  const { user, logout } = useAuthStore()

  return (
    <header className="h-14 bg-surface-900 border-b border-surface-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
        <span className="text-xs text-surface-600 font-mono uppercase tracking-widest">
          Secure Research Environment
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          <span className="text-gray-400 font-medium">{user?.display_name || user?.username}</span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-surface-700 text-surface-400 text-xs">
            {user?.role}
          </span>
        </span>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
