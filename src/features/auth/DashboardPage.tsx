import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api/client'
import { useAuth } from './AuthContext'
import type { User } from './types'

export function DashboardPage() {
  const { logout } = useAuth()
  const { data, isPending, error } = useQuery({ queryKey: ['me'], queryFn: () => api<{ user: User }>('/me') })
  return (
    <main className="card">
      <h1>Dashboard</h1>
      {isPending && <p aria-busy="true">Loading…</p>}
      {error && <div role="alert" className="alert err">Could not load your profile.</div>}
      {data && !data.user.verified && (
        <div role="status" className="alert warn">Your email isn't verified. <Link to="/verify-email">Verify it</Link></div>
      )}
      {data && <p>Signed in as <strong>{data.user.name}</strong> ({data.user.email}) · role: {data.user.role}</p>}
      <p><Link to="/settings">Settings</Link></p>
      {data && (
        <p>
          {/* Permission-based UI: shown disabled (not hidden) so users know it exists. The server still enforces. */}
          {data.user.role === 'admin'
            ? <Link to="/admin">Admin: manage users</Link>
            : <span aria-disabled="true" title="Admins only" className="disabled-link">Admin: manage users (admins only)</span>}
        </p>
      )}
      <button className="primary" onClick={() => void logout()}>Log out</button>
    </main>
  )
}
