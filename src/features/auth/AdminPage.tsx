import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api/client'
import type { User } from './types'
import { ForbiddenPage } from './ErrorPages'

export function AdminPage() {
  const { data, isPending, error } = useQuery({ queryKey: ['admin-users'], queryFn: () => api<{ users: User[] }>('/admin/users') })
  // The server is the real authority: show 403 distinctly even if the client-side role check passed.
  if (error instanceof ApiError && error.status === 403) return <ForbiddenPage />
  return (
    <main className="card">
      <h1>Admin: users</h1>
      {isPending && <p aria-busy="true">Loading…</p>}
      {error && <div role="alert" className="alert err">Could not load users.</div>}
      {data && (
        <ul>
          {data.users.map((u) => (
            // React escapes text; never use dangerouslySetInnerHTML for server data.
            <li key={u.id}>{u.name} ({u.email}) · {u.role}{u.verified ? '' : ' · unverified'}</li>
          ))}
        </ul>
      )}
      <p><Link to="/dashboard">Back to dashboard</Link></p>
    </main>
  )
}
