import { apiGet, apiGetPdf } from './client'
import type { ReporteDiarioResponse } from './domain'

const consulta = (fecha: string) => `?fecha=${encodeURIComponent(fecha)}`

/**
 * ADMIN only (HU-12). The day is the Bogotá calendar day; cancelled invoices do not add to the totals but are
 * counted and listed. A day without sales answers 200 with an empty report and a message.
 */
export function reporteDiario(fecha: string): Promise<ReporteDiarioResponse> {
  return apiGet<ReporteDiarioResponse>(`/reportes/ventas-diarias${consulta(fecha)}`)
}

export function pdfReporteDiario(fecha: string) {
  return apiGetPdf(`/reportes/ventas-diarias/pdf${consulta(fecha)}`)
}
