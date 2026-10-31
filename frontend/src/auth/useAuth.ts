import { createContext, useContext } from 'react'
import type { Role, UserResponse } from '../api/auth'

export const AVISO_SESION_VENCIDA = 'Su sesión venció'

export interface AuthContextType {
  user: UserResponse | null
  token: string | null
  /** Message to show on the login screen after the session ended on its own. */
  aviso: string | null
  /** Starts a session from an AuthCore token. Returns false when the token is unusable or expired. */
  login: (token: string) => boolean
  logout: () => void
  hasRole: (role: Role) => boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
