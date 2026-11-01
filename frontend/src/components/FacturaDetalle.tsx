import { useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import type { FacturaResponse } from '../api/domain'
import { pdfFactura } from '../api/ventas'
import { guardarArchivo } from '../lib/descargar'
import { formatearPesos } from '../lib/formato'
import { MensajeError } from './FormFields'
import { Button } from './ui/button'

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })

/** An invoice exactly as the server stored it: every amount comes from the server (RNF-09). */
export function FacturaDetalle({ factura, acciones }: { factura: FacturaResponse; acciones?: ReactNode }) {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const descargar = async () => {
    setDescargando(true)
    setError(null)
    try {
      guardarArchivo(await pdfFactura(factura.numero))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el PDF')
    } finally {
      setDescargando(false)
    }
  }

  const anulada = factura.estado === 'ANULADA'

  return (
    <article aria-label={`Factura ${factura.numero}`} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Factura {factura.numero}</h2>
            {anulada && (
              <span className="inline-flex items-center rounded-full bg-[var(--pill-negative-bg)] px-2 py-0.5 text-xs font-medium text-[var(--pill-negative-ink)]">
                ANULADA
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {FECHA.format(new Date(factura.fecha))} · Vendedor: {factura.vendedor}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void descargar()} disabled={descargando}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {descargando ? 'Descargando...' : 'Descargar PDF'}
          </Button>
          {acciones}
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <div className="text-sm">
          <p className="font-medium">Cliente: {factura.clienteNombre}</p>
          {(factura.clienteDireccion || factura.clienteTelefono) && (
            <p className="text-muted-foreground">
              {[factura.clienteDireccion, factura.clienteTelefono && `Tel. ${factura.clienteTelefono}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {anulada && (
          <p className="rounded-md border border-border bg-[var(--pill-negative-bg)] px-3 py-2 text-sm text-[var(--pill-negative-ink)]">
            Anulada por {factura.anuladaPor}
            {factura.anuladaEn && ` el ${FECHA.format(new Date(factura.anuladaEn))}`}. Motivo: {factura.motivoAnulacion}
          </p>
        )}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Líneas de la factura {factura.numero}</caption>
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Código</th>
                <th className="px-3 py-2 text-left font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Precio</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                <th className="px-3 py-2 text-right font-medium">IVA</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {factura.lineas.map(l => (
                <tr key={l.codigo}>
                  <td className="px-3 py-2">{l.codigo}</td>
                  <td className="px-3 py-2">{l.nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.cantidad}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(l.precioBase)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(l.subtotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(l.iva)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto grid grid-cols-[max-content_max-content] gap-x-8 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right tabular-nums">{formatearPesos(factura.subtotal)}</dd>
          <dt className="text-muted-foreground">IVA</dt>
          <dd className="text-right tabular-nums">{formatearPesos(factura.iva)}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="text-right text-lg font-bold tabular-nums">{formatearPesos(factura.total)}</dd>
        </dl>

        <MensajeError mensaje={error} />
      </div>
    </article>
  )
}
