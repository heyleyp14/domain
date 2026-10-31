import { apiGet, apiPost } from './client'
import type { CompraRequest, CompraResponse } from './domain'

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

/** GET /api/compras with optional filters; newest first. */
export function listarCompras(filtros: FiltrosCompras = {}): Promise<CompraResponse[]> {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor?.trim()) params.set(clave, valor.trim())
  }
  const consulta = params.toString()
  return apiGet<CompraResponse[]>(`/compras${consulta ? `?${consulta}` : ''}`)
}

export function obtenerCompra(codigo: string): Promise<CompraResponse> {
  return apiGet<CompraResponse>(`/compras/${encodeURIComponent(codigo.trim().toUpperCase())}`)
}
