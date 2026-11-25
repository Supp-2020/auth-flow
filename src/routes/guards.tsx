import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { safeRedirect } from '../lib/redirect'
import { IdleGuard } from '../features/auth/IdleGuard'
import { ForbiddenPage } from '../features/auth/ErrorPages'
import type { Role } from '../features/auth/types'

export function CheckingSession() {
  return (
    <main className="card" role="status" aria-busy="true">
      <p>Checking your session…</p>
    </main>
  )
}

/** Protected routes: never render children until the session check completes. */
export function RequireAuth() {
  const { status, sessionExpired } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <CheckingSession />
  if (status === 'unauthenticated') {
    const target = location.pathname + location.search + location.hash
    const expired = sessionExpired ? 'expired=1&' : ''
    return <Navigate to={`/login?${expired}redirect=${encodeURIComponent(target)}`} replace />
  }
  return (
    <>
      <IdleGuard />
      <Outlet />
    </>
  )
}

/** Role-based access: signed in but wrong role => 403 page (never the protected content). Server still enforces. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  if (user?.role !== role) return <ForbiddenPage />
  return <Outlet />
}

/** Login/signup etc.: send already-authenticated users away. */
export function PublicOnly() {
  const { status } = useAuth()
  const [params] = useSearchParams()
  if (status === 'loading') return <CheckingSession />
  if (status === 'authenticated') return <Navigate to={safeRedirect(params.get('redirect'))} replace />
  return <Outlet />
}
