# Auth Flow UI (frontend only, mocked backend)

A learning project: login, signup, password reset, email verification, protected routes, roles, silent token refresh, idle timeout and multi-tab sync, built with React + TypeScript against a **mock API (MSW)**.

> **The mock auth is for learning only and is not secure.** Never enter real passwords or real user data. All "users" below are fake. Real security is enforced by the server; every client-side check here (guards, role checks, validation) exists for UX only.

## Run it

```powershell
npm install
npm run dev          # http://localhost:5173
npm test             # unit + component + axe tests (Vitest)
npm run test:e2e     # Playwright (first time: npx playwright install chromium)
npm run build
```

## Mock accounts

| Email | Password | Notes |
| --- | --- | --- |
| `user@example.test` | `Password-1234!` | normal user |
| `admin@example.test` | `Password-1234!` | can open `/admin` |
| `unverified@example.test` | `Password-1234!` | sees the "verify your email" banner |
| `locked@example.test` | `Password-1234!` | always answered with `429` + `Retry-After` |

Five wrong passwords for any account locks it for 30 s (`429`, "Too many attempts, try again in Ns").

There is no real email. Verification and reset links appear in the **mock inbox** at `/mock-inbox` (a learning aid; a real app has no such page).

### Dev switches (browser console)

```js
localStorage['mock.fail'] = '500'      // or 'network' | 'timeout'; delete the key to turn off
localStorage['dev.idleMs'] = '5000'    // idle time before the warning (default 5 min)
localStorage['dev.warnMs'] = '15000'   // warning length (default 60 s)
localStorage.removeItem('mock.db')     // reset the mock database
```

Access tokens live **30 s** in this mock, so you can watch silent refresh happen (it renews ~10 s before expiry, and also on a 401).

## Token storage: the decision

| Option | Pros | Cons |
| --- | --- | --- |
| **Access token in memory + refresh token in an httpOnly cookie** | Best protection against XSS token theft; JS can never read the refresh token | Needs a real server to set the cookie; cookies bring CSRF concerns (use `SameSite`, CSRF tokens) |
| `localStorage` | Simple; survives restarts and is shared across tabs | Any script on the page can read it, so one XSS hole leaks the token |
| `sessionStorage` | Cleared when the tab closes | Same XSS exposure; not shared across tabs |

**What this project does**

- Access token: **in memory only** (never written to storage). A reload gets a fresh one from the refresh token.
- Refresh token: **`localStorage` when "Remember me" is ticked, otherwise `sessionStorage`.** This is the learning compromise: **MSW cannot set a real httpOnly cookie** (it only intercepts `fetch` in the page), so the ideal option can't be demonstrated here. In production you would use the httpOnly-cookie design.
- Refresh tokens **rotate**: each refresh returns a new one and invalidates the old one.
- Tokens are never logged, never put in URLs, and never committed. (Reset and verification links carry a one-time token in the URL by design; they are single-use and short-lived.)
- Passwords are never stored on the client; password fields are reset after use.

**CSRF vs XSS:** cookie-based tokens trade XSS exposure for CSRF exposure (mitigated with `SameSite` and CSRF tokens); storage-based tokens are immune to CSRF but exposed to XSS. This app also avoids `dangerouslySetInnerHTML` and renders server text as escaped React text.

## How it works

- **Auth state:** `AuthProvider` (`src/features/auth/AuthContext.tsx`) holds `user` and `status` (`loading | authenticated | unauthenticated`). On load it shows "Checking your session…" and restores the session via the refresh token, so there is no flash of the login page.
- **Guards** (`src/routes/guards.tsx`): `RequireAuth` (redirects to `/login?redirect=…`), `PublicOnly` (sends signed-in users away from login/signup), `RequireRole` (403 page). Protected content never renders before the session check finishes.
- **Redirect safety:** `safeRedirect` only accepts same-origin relative paths (blocks `//evil`, `https://…`, backslashes).
- **HTTP client** (`src/lib/api`): a small fetch wrapper that attaches the token and, on a 401, refreshes and retries once. Refresh is **single-flight** (concurrent 401s share one call) and serialised across tabs with `navigator.locks`. A rejected refresh clears the session and redirects with "Your session expired"; an offline/5xx refresh keeps the session so you are not logged out for losing Wi-Fi.
- **Idle timeout:** warning dialog (`role="alertdialog"`, focus trapped) with "Stay signed in".
- **Multi-tab:** `BroadcastChannel` carries `login`/`logout` events (no tokens) so other tabs follow.
- **Validation:** Zod schemas (`src/lib/validation/auth.ts`) with React Hook Form; errors show on blur/submit, the submit button is disabled while loading, server errors map onto fields (e.g. 409 → email).
- **Privacy of responses:** login returns one generic error for unknown email or wrong password; forgot-password always answers "If that account exists, we sent an email."

```
src/
  features/auth/   pages, AuthContext, form components, idle guard
  lib/api/         fetch client, refresh (single-flight), tokens, tab sync
  lib/validation/  Zod schemas
  mocks/           MSW handlers + fake database
  routes/          route table and guards
e2e/               Playwright specs (flows + axe)
```

## Tests

- **Unit:** validation schemas, redirect safety, token-expiry helpers, idle hook.
- **Component** (Testing Library): errors on submit/blur, disabled-while-submitting, 409 → field error, password toggle, autocomplete attributes, guards.
- **Integration** (MSW in Node): refresh-then-retry, one refresh for concurrent 401s, rejected refresh → session cleared, offline refresh keeps session.
- **Accessibility:** axe on 8 pages in Vitest (jsdom cannot check colour contrast) and axe on all the pages (public, dashboard, settings, admin, 403, 404) in a real browser with Playwright (includes contrast).
- **E2E (Playwright):** signup → verify → login, redirect-after-login, open-redirect blocked, session expiry, silent refresh, roles/403/404, idle warning and timeout, logout and login across two tabs.

## Known limitations

- **Mock server quirks:** the "server" runs inside each tab. To make tabs behave like one backend it reloads state from `localStorage` on every request. Real servers don't work like this.
- Social login, 2FA/OTP, passkeys and a dedicated `/session-expired` page are **not built** (expiry shows a banner on the login page instead).
- Light/dark follows the OS (`prefers-color-scheme`); there is no manual toggle.
- Lockout and rate-limit feedback show the server message; there is no live countdown.
- Idle time is per tab: activity in one tab doesn't reset another tab's timer.
- Loading states are button spinners/text and "Loading…" text, not skeleton screens.
- Reloading while offline shows the login page until you retry (the refresh token is kept).

## Deployment

It's a static Vite build (`npm run build` → `dist/`). `public/_redirects` provides the SPA fallback for Netlify; other hosts need an equivalent rewrite of all paths to `index.html`.

**This build ships the mock API** (`public/mockServiceWorker.js` + MSW handlers) because the project has no backend. That's fine for a demo, but it means the "server" runs in the visitor's browser. For a real deployment, remove the MSW start in `src/main.tsx`, point `/api` at a real backend that sets the refresh token as an httpOnly cookie, and switch `src/lib/api/tokens.ts` accordingly.
