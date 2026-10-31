import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { registrarSesion } from '../api/client'
import type { Role, UserResponse } from '../api/auth'
import { estaVencido, leerJwt } from './jwt'
import { AVISO_SESION_VENCIDA, AuthContext, useAuth, type AuthContextType } from './useAuth'

/** The token lives in memory and in sessionStorage (it survives a reload, not closing the tab). Never localStorage. */
const CLAVE_TOKEN = 'token'


interface Sesion {
  token: string
  user: UserResponse
  expiraEn: number
}

function sesionDesdeToken(token: string): Sesion | null {
  const datos = leerJwt(token)
  if (!datos || estaVencido(datos)) return null
  return { token, expiraEn: datos.expiraEn, user: { id: datos.id ?? 0, username: datos.username, roles: datos.roles } }
}

function leerAlmacenado(): { sesion: Sesion | null; vencida: boolean } {
  const guardado = sessionStorage.getItem(CLAVE_TOKEN)
  if (!guardado) return { sesion: null, vencida: false }
  const sesion = sesionDesdeToken(guardado)
  if (!sesion) sessionStorage.removeItem(CLAVE_TOKEN)
  return { sesion, vencida: !sesion }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restored synchronously, so the first render already knows the user (no "loading" flash).
  const [inicial] = useState(leerAlmacenado)
  const [sesion, setSesion] = useState<Sesion | null>(inicial.sesion)
  const [aviso, setAviso] = useState<string | null>(inicial.vencida ? AVISO_SESION_VENCIDA : null)
  const tokenActual = useRef<string | null>(inicial.sesion?.token ?? null)

  const cerrar = useCallback((motivo: string | null) => {
    tokenActual.current = null
    sessionStorage.removeItem(CLAVE_TOKEN)
    setSesion(null)
    setAviso(motivo)
  }, [])

  const login = useCallback((token: string) => {
    const nueva = sesionDesdeToken(token)
    if (!nueva) return false
    tokenActual.current = token
    sessionStorage.setItem(CLAVE_TOKEN, token)
    setSesion(nueva)
    setAviso(null)
    return true
  }, [])

  const logout = useCallback(() => cerrar(null), [cerrar])

  // The HTTP client reads the token from the ref, so a request right after login already carries it.
  useEffect(() => {
    registrarSesion(() => tokenActual.current, () => cerrar(AVISO_SESION_VENCIDA))
  }, [cerrar])

  // End the session exactly when the token expires.
  useEffect(() => {
    if (!sesion) return
    const restante = sesion.expiraEn - Date.now()
    const temporizador = setTimeout(() => cerrar(AVISO_SESION_VENCIDA), Math.max(0, restante))
    return () => clearTimeout(temporizador)
  }, [sesion, cerrar])

  const valor = useMemo<AuthContextType>(
    () => ({
      user: sesion?.user ?? null,
      token: sesion?.token ?? null,
      aviso,
      login,
      logout,
      hasRole: (role: Role) => sesion?.user.roles.includes(role) ?? false,
    }),
    [sesion, aviso, login, logout],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

interface PrivateRouteProps {
  render: () => ReactNode
  /** When given, the user needs at least one of these roles; otherwise "No tiene permiso" is shown. */
  allowedRoles?: Role[]
}

/** Protects a route: without a session it redirects to /login and remembers where the user was going. */
export function PrivateRoute({ render, allowedRoles }: PrivateRouteProps) {
  const { user, hasRole } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (allowedRoles && !allowedRoles.some(role => hasRole(role))) {
    return (
      <div className="no-permission" role="alert">
        <h2>No tiene permiso</h2>
        <p>Esta sección es solo para el rol {allowedRoles.join(' o ')}.</p>
      </div>
    )
  }

  return <>{render()}</>
}
