import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { DashboardPage } from '../features/auth/DashboardPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage'
import { MockInboxPage } from '../features/auth/MockInboxPage'
import { ProfilePage } from '../features/auth/ProfilePage'
import { AdminPage } from '../features/auth/AdminPage'
import { ForbiddenPage, NotFoundPage } from '../features/auth/ErrorPages'
import { PublicOnly, RequireAuth, RequireRole } from './guards'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Reachable whether or not you are logged in (links from email). */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/mock-inbox" element={<MockInboxPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<ProfilePage />} />
        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/403" element={<ForbiddenPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
