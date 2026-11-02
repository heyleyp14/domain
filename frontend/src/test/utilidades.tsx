import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext'
import { AppRoutes } from '../App'
import type { Role } from '../api/auth'

function base64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** A token shaped like AuthCore's (base64url, HS384 header). The signature is fake: the client never checks it. */
export function tokenDePrueba(opciones: { sub?: string; roles?: Role[]; uid?: number; expiraEnSegundos?: number } = {}): string {
  const { sub = 'vendedor1', roles = ['USER'], uid = 7, expiraEnSegundos = 3600 } = opciones
  const ahora = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'HS384' }))
  const payload = base64Url(JSON.stringify({ sub, uid, roles, iat: ahora, exp: ahora + expiraEnSegundos }))
  return `${header}.${payload}.firma-de-prueba`
}

/**
 * Renders the real routes at a given URL, optionally with a stored session (as after a page reload).
 * `strict` reproduces the StrictMode double-mount of the real app (`main.tsx`).
 */
export function renderApp(ruta: string, token?: string, { strict = false }: { strict?: boolean } = {}) {
  if (token) sessionStorage.setItem('token', token)
  const arbol = (
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  )
  return render(strict ? <StrictMode>{arbol}</StrictMode> : arbol)
}

/** Minimal fetch stub: returns the given status and JSON body. */
export function respuestaJson(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })
}
