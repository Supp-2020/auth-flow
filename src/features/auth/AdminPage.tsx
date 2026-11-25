import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api/client'
import { AppShell } from '../../components/AppShell'
import type { User } from './types'
import { ForbiddenPage } from './ErrorPages'

export function AdminPage() {
  const { data, isPending, error } = useQuery({ queryKey: ['admin-users'], queryFn: () => api<{ users: User[] }>('/admin/users') })
  // The server is the real authority: show 403 distinctly even if the client-side role check passed.
  if (error instanceof ApiError && error.status === 403) return <ForbiddenPage />
  return (
    <AppShell>
      <div>
        <h1 className="page-title">Admin: users</h1>
        <p className="page-sub">Everyone with an account in this mock.</p>
      </div>
      <div className="panel">
        {isPending && <p aria-busy="true">Loading…</p>}
        {error && <div role="alert" className="alert alert-error">Could not load users.</div>}
        {data && (
          <ul className="list">
            {data.users.map((u) => (
              // React escapes text; never use dangerouslySetInnerHTML for server data.
              <li key={u.id}>{u.name} ({u.email}) · {u.role}{u.verified ? '' : ' · unverified'}</li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
