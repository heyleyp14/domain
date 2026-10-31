import { apiGet, apiPost, apiPut } from './client'
import type {
  BusquedaProductosResponse,
  ProductoEdicionRequest,
  ProductoNuevoRequest,
  ProductoResponse,
  ProveedorDetalleResponse,
  ProveedorRequest,
  ProveedorResponse,
} from './domain'

export interface FiltrosProductos {
  q?: string
  soloActivos?: boolean
  bajoStock?: boolean
}

/** GET /api/productos. The server returns every match (no paging); the screen shows them in pages of 50. */
export function buscarProductos({ q, soloActivos, bajoStock }: FiltrosProductos): Promise<BusquedaProductosResponse> {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  if (soloActivos) params.set('soloActivos', 'true')
  if (bajoStock) params.set('bajoStock', 'true')
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

export function listarProveedores(q?: string): Promise<ProveedorResponse[]> {
  return apiGet<ProveedorResponse[]>(`/proveedores${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
}

export function obtenerProveedor(id: number): Promise<ProveedorDetalleResponse> {
  return apiGet<ProveedorDetalleResponse>(`/proveedores/${id}`)
}

export function crearProveedor(data: ProveedorRequest): Promise<ProveedorResponse> {
  return apiPost<ProveedorResponse>('/proveedores', data)
}

export function editarProveedor(id: number, data: ProveedorRequest): Promise<ProveedorResponse> {
  return apiPut<ProveedorResponse>(`/proveedores/${id}`, data)
}
