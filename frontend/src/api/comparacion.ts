import { apiGet } from './client'
import type { ComparacionResponse } from './domain'

/**
 * ADMIN only (HU-11). For each supplier: its latest purchase price (current offer) and its lowest
 * historical price. A product without purchases answers 200 with no offers and a message.
 */
export function compararPrecios(codigo: string, pagina = 1): Promise<ComparacionResponse> {
  return apiGet<ComparacionResponse>(`/productos/${encodeURIComponent(codigo)}/comparacion-precios?pagina=${pagina}`)
}
