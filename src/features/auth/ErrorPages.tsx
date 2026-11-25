import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="card">
      <h1>Page not found</h1>
      <p>We couldn't find that page.</p>
      <p><Link to="/dashboard">Go to dashboard</Link></p>
    </main>
  )
}

/** 403: you are signed in, but not allowed here. Distinct from 401 (not signed in). */
export function ForbiddenPage() {
  return (
    <main className="card">
      <h1>Access denied</h1>
      <div role="alert" className="alert err">You don't have permission to view this page.</div>
      <p><Link to="/dashboard">Back to dashboard</Link></p>
    </main>
  )
}
