import { apiGet, apiPost } from './client'
import type { CompraRequest, CompraResponse, ComprasResponse } from './domain'

export interface FiltrosCompras {
  proveedorId?: string
  /** AAAA-MM-DD, inclusive. */
  desde?: string
  hasta?: string
  /** Product code contained in the purchase. */
  producto?: string
}

/** ADMIN only. All or nothing: the purchase and every stock increase commit together. */
export function registrarCompra(data: CompraRequest): Promise<CompraResponse> {
  return apiPost<CompraResponse>('/compras', data)
}

/** GET /api/compras con filtros opcionales; primero las más recientes, en páginas. */
export function listarCompras(filtros: FiltrosCompras = {}, pagina = 1): Promise<ComprasResponse> {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor?.trim()) params.set(clave, valor.trim())
  }
  params.set('pagina', String(pagina))
  return apiGet<ComprasResponse>(`/compras?${params.toString()}`)
}

export function obtenerCompra(codigo: string): Promise<CompraResponse> {
  return apiGet<CompraResponse>(`/compras/${encodeURIComponent(codigo.trim().toUpperCase())}`)
}
