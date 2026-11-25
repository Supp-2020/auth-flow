export function Logo({ onBlue = false, size = 32 }: { onBlue?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill={onBlue ? '#fff' : '#2563EB'} />
      <path d="M9 21l7-11 7 11" stroke={onBlue ? '#2563EB' : '#fff'} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const BRAND_NAME = 'Northwind'

export function CheckDot() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FDE047" />
      <path d="M6 10.5l3 3 5-6" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M19 10.2c0-.6-.1-1.2-.2-1.7H10v3.3h5a4.3 4.3 0 01-1.9 2.8v2.3h3c1.8-1.6 2.9-4 2.9-6.7z" fill="#4285F4" />
      <path d="M10 19c2.5 0 4.6-.8 6.1-2.3l-3-2.3c-.8.6-1.9.9-3.1.9-2.4 0-4.400-1.600-5.100-3.800H1.800v2.400A9 9 0 0010 19z" fill="#34A853" />
      <path d="M4.900 11.500a5.400 5.400 0 010-3.400V5.700H1.800a9 9 0 000 8.200z" fill="#FBBC05" />
      <path d="M10 4.600c1.400 0 2.600.5 3.600 1.400l2.700-2.700A9 9 0 001.800 5.700l3.100 2.400C5.600 6.200 7.600 4.600 10 4.600z" fill="#EA4335" />
    </svg>
  )
}

export function MailIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}
