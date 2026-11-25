export type Role = 'user' | 'admin'
export interface User { id: string; name: string; email: string; role: Role; verified: boolean }
export interface TokenResponse { accessToken: string; refreshToken: string; expiresIn: number; user?: User }
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
