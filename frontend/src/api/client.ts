// Single HTTP client for both services (same origin, through the Vite or nginx proxy).
// - Adds the Bearer token to every request.
// - On a 401 from a protected endpoint, it ends the session ("Su sesión venció").
// - Every error is an ApiError with the HTTP status, the server message and its details, so screens
//   can mark each invalid field (400) or list each missing product (409).

import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './auth'

const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number
  readonly detalles: string[]

  constructor(status: number, mensaje: string, detalles: string[] = []) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.detalles = detalles
  }
}

// The client holds the current token itself. AuthProvider sets it synchronously (on start, login and
// logout), so the very first request of a screen already carries it, whatever the effect order.
let tokenSesion: string | null = null
let alExpirarSesion: () => void = () => {}

export function fijarToken(token: string | null): void {
  tokenSesion = token
}

/** What to do when the server answers 401 to a request made with the session (AuthProvider ends it). */
export function alExpirar(accion: () => void): void {
  alExpirarSesion = accion
}

const obtenerToken = () => tokenSesion

async function leerError(response: Response): Promise<ApiError> {
  const cuerpo = (await response.json().catch(() => ({}))) as Record<string, unknown>
  // The domain service answers {mensaje, detalles}; AuthCore answers {error}.
  const mensaje =
    (typeof cuerpo.mensaje === 'string' && cuerpo.mensaje) ||
    (typeof cuerpo.error === 'string' && cuerpo.error) ||
    `Error ${response.status}`
  const detalles = Array.isArray(cuerpo.detalles) ? cuerpo.detalles.map(String) : []
  return new ApiError(response.status, mensaje, detalles)
}

async function solicitar(path: string, init: RequestInit = {}, conSesion = true): Promise<Response> {
  const headers = new Headers(init.headers)
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = conSesion ? obtenerToken() : null
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (response.ok) return response

  const error = await leerError(response)
  // AuthCore answers 403 (not 401) without a valid token; only a 401 means the session is gone.
  if (conSesion && response.status === 401) alExpirarSesion()
  throw error
}

async function comoJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function apiGet<T>(path: string): Promise<T> {
  return comoJson<T>(await solicitar(path))
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return comoJson<T>(await solicitar(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }))
}

export async function apiPut<T>(path: string, data: unknown): Promise<T> {
  return comoJson<T>(await solicitar(path, { method: 'PUT', body: JSON.stringify(data) }))
}

/** Sube un formulario multipart (por ejemplo, una imagen). El navegador fija el Content-Type con su boundary. */
export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return comoJson<T>(await solicitar(path, { method: 'POST', body: formData }))
}

/** Downloads a PDF and returns it with the file name from Content-Disposition. */
export async function apiGetPdf(path: string): Promise<{ archivo: Blob; nombre: string }> {
  const response = await solicitar(path, { headers: { Accept: 'application/pdf' } })
  const disposicion = response.headers.get('Content-Disposition') ?? ''
  const nombre = /filename="?([^";]+)"?/i.exec(disposicion)?.[1] ?? 'documento.pdf'
  return { archivo: await response.blob(), nombre }
}

// Public AuthCore endpoints: no token, and a 401 here means wrong credentials, not an expired session.
export async function authLogin(data: LoginRequest): Promise<LoginResponse> {
  return comoJson<LoginResponse>(await solicitar('/auth/login', { method: 'POST', body: JSON.stringify(data) }, false))
}

export async function authRegister(data: RegisterRequest): Promise<RegisterResponse> {
  return comoJson<RegisterResponse>(await solicitar('/auth/register', { method: 'POST', body: JSON.stringify(data) }, false))
}
