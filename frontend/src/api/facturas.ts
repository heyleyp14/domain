import { apiGet, apiGetPdf, apiPost } from './client'
import type { FacturaResponse, AnulacionRequest } from './domain'

const ruta = (numero: string) => `/facturas/${encodeURIComponent(numero.trim().toUpperCase())}`

/** Listar facturas (soporta filtro por fecha). */
export async function listarFacturas(fecha?: string): Promise<FacturaResponse[]> {
  const params = fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''
  return apiGet<FacturaResponse[]>(`/facturas${params}`)
}

/** Obtener una factura por número (para listado/detalle). */
export async function obtenerFacturaDetalle(numero: string): Promise<FacturaResponse> {
  return apiGet<FacturaResponse>(ruta(numero))
}

/** Anular una factura (ADMIN). */
export async function anularFacturaAdmin(numero: string, motivo: string): Promise<FacturaResponse> {
  return apiPost<FacturaResponse>(`${ruta(numero)}/anulacion`, { motivo } satisfies AnulacionRequest)
}

/** Descargar el PDF de una factura. */
export function pdfFacturaDetalle(numero: string) {
  return apiGetPdf(`${ruta(numero)}/pdf`)
}