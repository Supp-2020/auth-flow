import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { safeRedirect } from '../lib/redirect'

export function CheckingSession() {
  return (
    <main className="card" role="status" aria-busy="true">
      <p>Checking your session…</p>
    </main>
  )
}

/** Protected routes: never render children until the session check completes. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <CheckingSession />
  if (status === 'unauthenticated') {
    const target = location.pathname + location.search + location.hash
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />
  }
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
