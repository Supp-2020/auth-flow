import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { BRAND_NAME, Logo } from './Brand'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Signed-in frame from the design: header with brand, nav, avatar and Sign out. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div className="brand"><Logo size={28} />{BRAND_NAME}</div>
          <nav className="app-nav" aria-label="Main">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/settings">Settings</NavLink>
            {/* Permission-based UI: disabled (not hidden) for non-admins. The server still enforces. */}
            {user?.role === 'admin'
              ? <NavLink to="/admin">Admin</NavLink>
              : <span className="nav-off" aria-disabled="true" title="Admins only">Admin</span>}
          </nav>
        </div>
        <div className="user-chip">
          <span className="avatar" aria-hidden="true">{initials(user?.name ?? '')}</span>
          <span className="user-name">{user?.name}</span>
          <button type="button" className="btn btn-ghost" style={{ height: 44 }} onClick={() => void logout()}>Sign out</button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
