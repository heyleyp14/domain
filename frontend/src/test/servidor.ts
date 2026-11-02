import { vi } from 'vitest'
import type { ProductoResponse, ProveedorResponse } from '../api/domain'
import { respuestaJson } from './utilidades'

type Manejador = (url: URL, init: RequestInit) => Response | Promise<Response>

/**
 * Fake server for screen tests: answers by "METHOD /path" (query string ignored) and records every call.
 * Unknown routes fail the test loudly instead of hanging.
 */
export function servidorFalso(rutas: Record<string, Manejador>) {
  const llamadas: { metodo: string; url: URL; cuerpo: unknown }[] = []
  const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(entrada), 'http://localhost')
    const metodo = (init.method ?? 'GET').toUpperCase()
    llamadas.push({ metodo, url, cuerpo: typeof init.body === 'string' ? JSON.parse(init.body) : init.body })
    // Like the real services: every route except login and register needs the Bearer token. This catches
    // requests sent before the session is wired (a page that loads data on mount after a reload).
    const publica = ['/api/auth/login', '/api/auth/register'].includes(url.pathname)
    if (!publica && !new Headers(init.headers).get('Authorization')?.startsWith('Bearer ')) {
      return respuestaJson(401, { status: 401, mensaje: 'No autenticado: falta un token válido' })
    }
    const manejador = rutas[`${metodo} ${url.pathname}`]
    if (!manejador) throw new Error(`Ruta no simulada: ${metodo} ${url.pathname}`)
    return manejador(url, init)
  })
  vi.stubGlobal('fetch', fetchFalso)
  return {
    llamadas,
    /** Calls to one route, e.g. llamadasA('GET /api/productos'). */
    llamadasA: (ruta: string) => llamadas.filter(l => `${l.metodo} ${l.url.pathname}` === ruta),
    /**
     * Calls made by the screen under test, excluding the one-time GET /api/auth/me that AuthProvider
     * issues to load the avatar. Use it in "does not call the server" assertions.
     */
    llamadasDePantalla: () => llamadas.filter(l => l.url.pathname !== '/api/auth/me'),
  }
}

export const json = (status: number, cuerpo: unknown) => () => respuestaJson(status, cuerpo)

const auditoria = { creadoPor: 'admin', creadoEn: '2026-10-20T15:00:00Z', modificadoPor: null, modificadoEn: null }

export function proveedor(id: number, nombre: string, extra: Partial<ProveedorResponse> = {}): ProveedorResponse {
  return { id, nombre, telefono: '3001234567', correo: null, direccion: null, auditoria, ...extra }
}

export function producto(codigo: string, extra: Partial<ProductoResponse> = {}): ProductoResponse {
  return {
    id: 1, codigo, nombre: `Producto ${codigo}`, precioBase: 25000, aplicaIva: true, precioFinal: 29750,
    stock: 12, stockBajo: false, activo: true, proveedorId: 1, proveedorNombre: 'Distribuidora Andina', auditoria,
    ...extra,
  }
}

export function busqueda(productos: ProductoResponse[]) {
  return pagina('productos', productos, { mensaje: productos.length ? null : 'No se encontraron productos' })
}

/** Envoltorio de una página de cualquier lista. */
export function pagina<T>(clave: string, items: T[], extra: Record<string, unknown> = {}) {
  return { total: items.length, pagina: 1, tamano: 20, totalPaginas: 1, [clave]: items, ...extra }
}
