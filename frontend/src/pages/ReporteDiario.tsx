import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import type { ReporteDiarioResponse } from '../api/domain'
import { pdfReporteDiario, reporteDiario } from '../api/reportes'
import { CampoTexto } from '../components/Campo'
import { MensajeError } from '../components/FormFields'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { guardarArchivo } from '../lib/descargar'
import { hoyEnBogota } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'
import { cn } from '@/lib/utils'

const HORA = new Intl.DateTimeFormat('es-CO', { timeStyle: 'short', timeZone: 'America/Bogota' })
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Daily sales report (HU-12, RF-17). ADMIN only: the route is wrapped in <SoloAdmin>. */
export function ReporteDiario() {
  const hoy = hoyEnBogota()
  const [fecha, setFecha] = useState(hoy)
  const [respuesta, setRespuesta] = useState<{ fecha: string; r?: ReporteDiarioResponse; error?: string } | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState<string | null>(null)
  const valida = FECHA.test(fecha)

  useEffect(() => {
    if (!valida) return
    let vigente = true
    reporteDiario(fecha)
      .then(r => vigente && setRespuesta({ fecha, r }))
      .catch(e => vigente && setRespuesta({ fecha, error: e instanceof Error ? e.message : 'No se pudo consultar el reporte' }))
    return () => {
      vigente = false
    }
  }, [fecha, valida])

  const actual = valida && respuesta?.fecha === fecha ? respuesta : null
  const reporte = actual?.r

  const descargar = async () => {
    setDescargando(true)
    setErrorPdf(null)
    try {
      guardarArchivo(await pdfReporteDiario(fecha))
    } catch (e) {
      setErrorPdf(e instanceof Error ? e.message : 'No se pudo descargar el PDF')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporte diario de ventas</h1>
          <p className="text-sm text-muted-foreground">Totales, productos y facturas del día.</p>
        </div>
        {reporte && (
          <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => void descargar()} disabled={descargando}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {descargando ? 'Descargando...' : 'Descargar PDF'}
          </Button>
        )}
      </header>

      <Card className="p-4">
        <div className="max-w-xs">
          <CampoTexto id="reporte-fecha" label="Fecha" type="date" value={fecha} max={hoy}
            onChange={e => setFecha(e.target.value)} ayuda="El día se cuenta en hora de Bogotá" />
        </div>
      </Card>

      {valida && !actual && (
        <>
          <p className="sr-only">Consultando...</p>
          <div className="skeleton h-40 w-full" aria-hidden="true" />
        </>
      )}
      {!valida && <p className="text-sm text-muted-foreground">Seleccione una fecha.</p>}
      <MensajeError mensaje={actual?.error ?? errorPdf} />

      {reporte && (
        <Card role="region" aria-label={`Reporte del ${reporte.fecha}`} className="flex flex-col gap-4 p-4">
          {reporte.mensaje && <p className="text-sm text-muted-foreground">{reporte.mensaje}</p>}

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            <div className={cn('bg-card p-4', reporte.total === 0 && 'opacity-60')}>
              <dt className="text-xs text-muted-foreground">Total vendido</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-[var(--hue)]">{formatearPesos(reporte.total)}</dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-xs text-muted-foreground">Subtotal</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatearPesos(reporte.subtotal)}</dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-xs text-muted-foreground">IVA</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatearPesos(reporte.iva)}</dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-xs text-muted-foreground">Facturas emitidas</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{reporte.facturasEmitidas}</dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-xs text-muted-foreground">Facturas anuladas</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{reporte.facturasAnuladas}</dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-xs text-muted-foreground">Unidades vendidas</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{reporte.unidadesVendidas}</dd>
            </div>
          </dl>

          {reporte.facturasAnuladas > 0 && (
            <p className="text-xs text-muted-foreground">
              Las facturas anuladas aparecen en el listado, pero no suman en los totales.
            </p>
          )}

          {reporte.productos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Productos vendidos</h2>
              <div className="overflow-x-auto rounded-md border border-border">
                <table aria-label="Productos vendidos" className="w-full min-w-[620px] text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Código</th>
                      <th className="px-3 py-2 text-left font-medium">Producto</th>
                      <th className="px-3 py-2 text-right font-medium">Unidades</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-3 py-2 text-right font-medium">IVA</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reporte.productos.map(p => (
                      <tr key={p.codigo}>
                        <td className="px-3 py-2">{p.codigo}</td>
                        <td className="px-3 py-2">{p.nombre}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.cantidad}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(p.subtotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(p.iva)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {reporte.facturas.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Facturas del día</h2>
              <div className="overflow-x-auto rounded-md border border-border">
                <table aria-label="Facturas del día" className="w-full min-w-[620px] text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Número</th>
                      <th className="px-3 py-2 text-left font-medium">Hora</th>
                      <th className="px-3 py-2 text-left font-medium">Cliente</th>
                      <th className="px-3 py-2 text-left font-medium">Vendedor</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reporte.facturas.map(f => (
                      <tr key={f.numero} className={cn(f.anulada && 'opacity-60')}>
                        <td className="px-3 py-2">
                          <Link to={`/facturas?numero=${encodeURIComponent(f.numero)}`} className="font-medium">{f.numero}</Link>
                        </td>
                        <td className="px-3 py-2">{HORA.format(new Date(f.fecha))}</td>
                        <td className="px-3 py-2">{f.cliente}</td>
                        <td className="px-3 py-2">{f.vendedor}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(f.total)}</td>
                        <td className="px-3 py-2">
                          {f.anulada ? (
                            <span className="inline-flex items-center rounded-full bg-[var(--pill-negative-bg)] px-2 py-0.5 text-xs font-medium text-[var(--pill-negative-ink)]">
                              Anulada
                            </span>
                          ) : 'Emitida'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </Card>
      )}
    </section>
  )
}
