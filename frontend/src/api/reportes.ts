import { apiGet, apiGetPdf } from './client'
import type { ReporteDiarioResponse, TendenciaVentasResponse } from './domain'

const consulta = (fecha: string) => `?fecha=${encodeURIComponent(fecha)}`

/**
 * ADMIN only (HU-12). The day is the Bogotá calendar day; cancelled invoices do not add to the totals but are
 * counted and listed. A day without sales answers 200 with an empty report and a message.
 */
export function reporteDiario(fecha: string, paginaProductos = 1, paginaFacturas = 1): Promise<ReporteDiarioResponse> {
  const params = new URLSearchParams({ fecha })
  params.set('paginaProductos', String(paginaProductos))
  params.set('paginaFacturas', String(paginaFacturas))
  return apiGet<ReporteDiarioResponse>(`/reportes/ventas-diarias?${params.toString()}`)
}

/**
 * ADMIN only (T3.5). Ventas por día de los últimos `dias` (1 a 90), terminando hoy en hora de Bogotá.
 * Devuelve un punto por día, incluidos los días sin ventas en cero.
 */
export function tendenciaVentas(dias: number): Promise<TendenciaVentasResponse> {
  return apiGet<TendenciaVentasResponse>(`/reportes/tendencia-ventas?dias=${dias}`)
}

export function pdfReporteDiario(fecha: string) {
  return apiGetPdf(`/reportes/ventas-diarias/pdf${consulta(fecha)}`)
}
