import type { ReactNode } from 'react'
import { BRAND_NAME, CheckDot, Logo } from './Brand'

/** Split layout from the design: blue brand panel on the left, form column on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="brand"><Logo onBlue />{BRAND_NAME}</div>
        <div className="aside-body">
          <p className="aside-title">Pick up right where you left off.</p>
          <p className="aside-sub">Secure sessions that refresh quietly in the background, so you only sign in when you actually need to.</p>
        </div>
        <ul className="aside-list">
          <li><CheckDot />Short-lived access tokens, rotating refresh tokens</li>
          <li><CheckDot />Warning before your session ends, never a surprise</li>
        </ul>
      </aside>
      <main className="auth-main">
        <div className="auth-col">{children}</div>
      </main>
    </div>
  )
}
