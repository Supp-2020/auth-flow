import { axe } from 'vitest-axe'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage'
import { ForbiddenPage, NotFoundPage } from '../features/auth/ErrorPages'
import { renderPage } from './render'

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), signup: vi.fn(), logout: vi.fn(), status: 'unauthenticated', user: null, sessionExpired: false }),
}))

// jsdom has no layout engine, so axe cannot check colour contrast here; Playwright + axe covers that in a real browser.
const pages: [string, () => React.ReactElement, string?][] = [
  ['login', () => <LoginPage />],
  ['signup', () => <SignupPage />],
  ['forgot password', () => <ForgotPasswordPage />],
  ['reset password', () => <ResetPasswordPage />, '/reset-password?token=abc'],
  ['reset password (missing token)', () => <ResetPasswordPage />, '/reset-password'],
  ['verify email', () => <VerifyEmailPage />, '/verify-email?email=a%40b.test'],
  ['404', () => <NotFoundPage />],
  ['403', () => <ForbiddenPage />],
]

describe('accessibility (axe)', () => {
  it.each(pages)('%s has no violations', async (_name, ui, path) => {
    const { container } = renderPage(ui(), path)
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})
