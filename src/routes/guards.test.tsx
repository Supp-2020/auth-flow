import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PublicOnly, RequireAuth } from './guards'
import type { AuthStatus } from '../features/auth/types'

let mockStatus: AuthStatus = 'loading'
vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => ({ status: mockStatus }) }))

const Where = () => { const l = useLocation(); return <p>at {l.pathname}{l.search}</p> }

function renderAt(path: string, ui: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}

const tree = (
  <Routes>
    <Route element={<PublicOnly />}><Route path="/login" element={<Where />} /></Route>
    <Route element={<RequireAuth />}><Route path="/secret" element={<p>secret content</p>} /></Route>
    <Route path="/dashboard" element={<Where />} />
  </Routes>
)

describe('route guards', () => {
  it('shows a checking state and no protected content while loading', () => {
    mockStatus = 'loading'
    renderAt('/secret', tree)
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument()
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })
  it('redirects unauthenticated users to login with the original target', () => {
    mockStatus = 'unauthenticated'
    renderAt('/secret?x=1', (
      <Routes>
        <Route element={<RequireAuth />}><Route path="/secret" element={<p>secret content</p>} /></Route>
        <Route path="/login" element={<Where />} />
      </Routes>
    ))
    expect(screen.getByText(`at /login?redirect=${encodeURIComponent('/secret?x=1')}`)).toBeInTheDocument()
  })
  it('renders protected content when authenticated', () => {
    mockStatus = 'authenticated'
    renderAt('/secret', tree)
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })
  it('sends authenticated users away from /login, honouring safe redirects only', () => {
    mockStatus = 'authenticated'
    renderAt('/login', tree)
    expect(screen.getByText('at /dashboard')).toBeInTheDocument()
  })
})
