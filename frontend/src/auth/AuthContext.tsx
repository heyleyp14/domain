import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { alExpirar, fijarToken } from '../api/client'
import type { Role, UserResponse } from '../api/auth'
import { obtenerMiPerfil } from '../api/usuarios'
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
  // Before any screen renders: its first request must already carry the token (see alExpirar below).
  fijarToken(sesion?.token ?? null)
  return { sesion, vencida: !sesion }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restored synchronously, so the first render already knows the user (no "loading" flash).
  const [inicial] = useState(leerAlmacenado)
  const [sesion, setSesion] = useState<Sesion | null>(inicial.sesion)
  const [aviso, setAviso] = useState<string | null>(inicial.vencida ? AVISO_SESION_VENCIDA : null)
  const cerrar = useCallback((motivo: string | null) => {
    fijarToken(null)
    sessionStorage.removeItem(CLAVE_TOKEN)
    setSesion(null)
    setAviso(motivo)
  }, [])

  const login = useCallback((token: string) => {
    const nueva = sesionDesdeToken(token)
    if (!nueva) return false
    fijarToken(token)
    sessionStorage.setItem(CLAVE_TOKEN, token)
    setSesion(nueva)
    setAviso(null)
    return true
  }, [])

  const logout = useCallback(() => cerrar(null), [cerrar])

  // The token is handed to the HTTP client synchronously (leerAlmacenado, login, cerrar), never in an
  // effect: React runs the children's effects before the parent's, so a screen that loads data on mount
  // (after a reload or a direct link) would otherwise send its first request without the token, get a
  // 401 and end the session. The 401 handler itself is only needed once a response arrives.
  useEffect(() => {
    alExpirar(() => cerrar(AVISO_SESION_VENCIDA))
  }, [cerrar])

  // End the session exactly when the token expires.
  useEffect(() => {
    if (!sesion) return
    const restante = sesion.expiraEn - Date.now()
    const temporizador = setTimeout(() => cerrar(AVISO_SESION_VENCIDA), Math.max(0, restante))
    return () => clearTimeout(temporizador)
  }, [sesion, cerrar])

  // The JWT does not carry the image URL: fetch the profile once per token and keep it in memory.
  // If AuthCore is unavailable, the session still works and the UI falls back to the user's initial.
  // The dependency is the token, not the session object: updating the image must not refetch, and a
  // StrictMode remount must be able to retry after the first (cancelled) request.
  const tokenActual = sesion?.token ?? null
  useEffect(() => {
    if (!tokenActual) return
    let vigente = true
    obtenerMiPerfil()
      .then(perfil => {
        if (!vigente) return
        setSesion(actual => actual && actual.token === tokenActual
          ? { ...actual, user: { ...actual.user, imageUrl: perfil.imageUrl ?? null } }
          : actual)
      })
      .catch(() => {
        if (!vigente) return
      })
    return () => {
      vigente = false
    }
  }, [tokenActual])

  const actualizarImagen = useCallback((imageUrl: string | null) => {
    setSesion(actual => actual ? { ...actual, user: { ...actual.user, imageUrl } } : actual)
  }, [])

  const valor = useMemo<AuthContextType>(
    () => ({
      user: sesion?.user ?? null,
      token: sesion?.token ?? null,
      aviso,
      login,
      logout,
      hasRole: (role: Role) => sesion?.user.roles.includes(role) ?? false,
      actualizarImagen,
    }),
    [sesion, aviso, login, logout, actualizarImagen],
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
