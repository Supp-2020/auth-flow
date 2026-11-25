import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'
import { ApiError } from '../../lib/api/client'
import { renderPage } from '../../test/render'

const auth = { login: vi.fn(), signup: vi.fn(), logout: vi.fn(), status: 'unauthenticated', user: null, sessionExpired: false }
vi.mock('./AuthContext', () => ({ useAuth: () => auth }))

beforeEach(() => { auth.login.mockReset(); auth.signup.mockReset() })

describe('LoginPage', () => {
  it('shows inline errors on submit and focuses the first invalid field', async () => {
    renderPage(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('does not show errors while typing, only after blur', async () => {
    renderPage(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument()
    await userEvent.tab()
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('disables the button while submitting and prevents double submit', async () => {
    let resolve!: () => void
    auth.login.mockReturnValue(new Promise<void>((r) => { resolve = r }))
    renderPage(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'USER@example.test ')
    await userEvent.type(screen.getByLabelText('Password'), 'whatever')
    const btn = screen.getByRole('button', { name: 'Log in' })
    await userEvent.click(btn)
    const busy = await screen.findByRole('button', { name: /logging in/i })
    expect(busy).toBeDisabled()
    await userEvent.click(busy)
    resolve()
    await waitFor(() => expect(auth.login).toHaveBeenCalledTimes(1))
    expect(auth.login).toHaveBeenCalledWith('user@example.test', 'whatever', false)   // trimmed + lowercased
  })

  it('shows a generic server error in an alert', async () => {
    auth.login.mockRejectedValue(new ApiError(401, 'Invalid email or password'))
    renderPage(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.type(screen.getByLabelText('Password'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('toggles password visibility with an accessible button', async () => {
    renderPage(<LoginPage />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('sets autocomplete attributes for password managers', () => {
    renderPage(<LoginPage />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
  })
})

describe('SignupPage', () => {
  const fill = async (over: Partial<Record<'Name' | 'Email' | 'Password' | 'Confirm password', string>> = {}) => {
    const v = { Name: 'Test User', Email: 'new@example.test', Password: 'Str0ng-Password!', 'Confirm password': 'Str0ng-Password!', ...over }
    for (const [label, value] of Object.entries(v)) await userEvent.type(screen.getByLabelText(label), value)
  }

  it('updates the rules checklist live', async () => {
    renderPage(<SignupPage />)
    expect(screen.getByText(/At least 12 characters/)).not.toHaveTextContent('(met)')
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng-Password!')
    expect(screen.getByText(/At least 12 characters/)).toHaveTextContent('(met)')
    expect(screen.getByRole('img', { name: /strength: strong/i })).toBeInTheDocument()
  })

  it('requires the terms checkbox and matching passwords', async () => {
    renderPage(<SignupPage />)
    await fill({ 'Confirm password': 'different' })
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(screen.getByText('You must accept the terms')).toBeInTheDocument()
    expect(auth.signup).not.toHaveBeenCalled()
  })

  it('maps a 409 server error onto the email field', async () => {
    auth.signup.mockRejectedValue(new ApiError(409, 'Email already registered', { fieldErrors: { email: 'Email already registered' } }))
    renderPage(<SignupPage />)
    await fill()
    await userEvent.click(screen.getByRole('checkbox', { name: /accept the terms/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    const email = screen.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('Email already registered')).toBeInTheDocument()
    expect(email).toHaveFocus()
  })
})
