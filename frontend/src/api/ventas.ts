import { apiGet, apiGetPdf, apiPost } from './client'
import type { FacturaRequest, FacturaResponse } from './domain'

const ruta = (numero: string) => `/facturas/${encodeURIComponent(numero.trim().toUpperCase())}`

/** POST /api/facturas: all or nothing. A 409 lists every product without enough stock in `detalles`. */
export function emitirFactura(data: FacturaRequest): Promise<FacturaResponse> {
  return apiPost<FacturaResponse>('/facturas', data)
}

export function obtenerFactura(numero: string): Promise<FacturaResponse> {
  return apiGet<FacturaResponse>(ruta(numero))
}

/** ADMIN only. Returns the stock and leaves the invoice ANULADA; a second cancellation is a 409. */
export function anularFactura(numero: string, motivo: string): Promise<FacturaResponse> {
  return apiPost<FacturaResponse>(`${ruta(numero)}/anulacion`, { motivo })
}

export function pdfFactura(numero: string) {
  return apiGetPdf(`${ruta(numero)}/pdf`)
}
