import { apiGet, apiPost, apiPut } from './client'
import type {
  BusquedaProductosResponse,
  ProductoEdicionRequest,
  ProductoNuevoRequest,
  ProductoResponse,
  ProveedorDetalleResponse,
  ProveedorRequest,
  ProveedorResponse,
  ProveedoresResponse,
} from './domain'

export interface FiltrosProductos {
  q?: string
  soloActivos?: boolean
  bajoStock?: boolean
  pagina?: number
  tamano?: number
}

/** GET /api/productos: una página de resultados con su total. */
export function buscarProductos({ q, soloActivos, bajoStock, pagina, tamano }: FiltrosProductos): Promise<BusquedaProductosResponse> {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  if (soloActivos) params.set('soloActivos', 'true')
  if (bajoStock) params.set('bajoStock', 'true')
  if (pagina) params.set('pagina', String(pagina))
  if (tamano) params.set('tamano', String(tamano))
  const consulta = params.toString()
  return apiGet<BusquedaProductosResponse>(`/productos${consulta ? `?${consulta}` : ''}`)
}

export function obtenerProducto(codigo: string): Promise<ProductoResponse> {
  return apiGet<ProductoResponse>(`/productos/${encodeURIComponent(codigo)}`)
}

export function crearProducto(data: ProductoNuevoRequest): Promise<ProductoResponse> {
  return apiPost<ProductoResponse>('/productos', data)
}

export function editarProducto(codigo: string, data: ProductoEdicionRequest): Promise<ProductoResponse> {
  return apiPut<ProductoResponse>(`/productos/${encodeURIComponent(codigo)}`, data)
}

export function desactivarProducto(codigo: string): Promise<ProductoResponse> {
  return apiPost<ProductoResponse>(`/productos/${encodeURIComponent(codigo)}/desactivar`)
}

export function activarProducto(codigo: string): Promise<ProductoResponse> {
  return apiPost<ProductoResponse>(`/productos/${encodeURIComponent(codigo)}/activar`)
}

export function listarProveedores(q?: string, pagina = 1, tamano = 20): Promise<ProveedoresResponse> {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  params.set('pagina', String(pagina))
  params.set('tamano', String(tamano))
  return apiGet<ProveedoresResponse>(`/proveedores?${params.toString()}`)
}

/** Para los desplegables que necesitan la lista completa, no una página. */
export async function listarTodosProveedores(): Promise<ProveedorResponse[]> {
  const todos: ProveedorResponse[] = []
  for (let pagina = 1; ; pagina++) {
    const r = await listarProveedores(undefined, pagina, 100)
    todos.push(...r.proveedores)
    if (r.proveedores.length === 0 || pagina >= r.totalPaginas) return todos
  }
}

export function obtenerProveedor(id: number, pagina = 1): Promise<ProveedorDetalleResponse> {
  return apiGet<ProveedorDetalleResponse>(`/proveedores/${id}?pagina=${pagina}`)
}

export function crearProveedor(data: ProveedorRequest): Promise<ProveedorResponse> {
  return apiPost<ProveedorResponse>('/proveedores', data)
}

export function editarProveedor(id: number, data: ProveedorRequest): Promise<ProveedorResponse> {
  return apiPut<ProveedorResponse>(`/proveedores/${id}`, data)
}
