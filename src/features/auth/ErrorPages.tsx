import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AuthLayout } from '../../components/AuthLayout'

export function NotFoundPage() {
  return (
    <AuthLayout>
      <div className="stack">
        <div>
          <h1 className="page-title">Page not found</h1>
          <p className="page-sub">We couldn't find that page.</p>
        </div>
        <Link className="btn btn-primary" to="/dashboard">Go to dashboard</Link>
      </div>
    </AuthLayout>
  )
}

/** 403: you are signed in, but not allowed here. Distinct from 401 (not signed in). */
export function ForbiddenPage() {
  return (
    <AppShell>
      <div className="panel stack" style={{ maxWidth: 560 }}>
        <h1 className="page-title">Access denied</h1>
        <div role="alert" className="alert alert-error">You don't have permission to view this page.</div>
        <Link className="btn btn-primary" to="/dashboard" style={{ alignSelf: 'flex-start' }}>Back to dashboard</Link>
      </div>
    </AppShell>
  )
}
