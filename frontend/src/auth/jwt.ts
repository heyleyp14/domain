// Reads the payload of a JWT issued by AuthCore. The signature is NOT verified here: that is the
// server's job. The client only needs sub, uid, roles and exp to build the session and the menu.

import type { Role } from '../api/auth'

export interface SesionJwt {
  username: string
  id: number | null
  roles: Role[]
  /** Expiration as epoch milliseconds. */
  expiraEn: number
}

const ROLES_CONOCIDOS: readonly Role[] = ['ADMIN', 'USER']

/** JWT segments are base64url (RFC 7515): "-" and "_" instead of "+" and "/", and no "=" padding. */
function base64UrlAUtf8(segmento: string): string {
  const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const bytes = Uint8Array.from(atob(relleno), c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Returns the session data, or null when the token is malformed or lacks sub/exp. */
export function leerJwt(token: string): SesionJwt | null {
  const partes = token.split('.')
  if (partes.length !== 3) return null
  try {
    const payload = JSON.parse(base64UrlAUtf8(partes[1])) as Record<string, unknown>
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null
    const crudos = Array.isArray(payload.roles) ? payload.roles : [payload.roles ?? payload.rol]
    const roles = crudos.filter((r): r is Role => ROLES_CONOCIDOS.includes(r as Role))
    return {
      username: payload.sub,
      id: typeof payload.uid === 'number' ? payload.uid : null,
      roles,
      expiraEn: payload.exp * 1000,
    }
  } catch {
    return null
  }
}

export function estaVencido(sesion: SesionJwt, ahora: number = Date.now()): boolean {
  return ahora >= sesion.expiraEn
}
