import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReporteDiarioResponse } from '../api/domain'
import { pdfReporteDiario, reporteDiario } from '../api/reportes'
import { Input, MensajeError } from '../components/FormFields'
import { guardarArchivo } from '../lib/descargar'
import { hoyEnBogota } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'

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
    <section className="pagina">
      <div className="pagina-encabezado">
        <h1>Reporte diario de ventas</h1>
        {reporte && (
          <button type="button" className="btn btn-secondary" onClick={() => void descargar()} disabled={descargando}>
            {descargando ? 'Descargando...' : 'Descargar PDF'}
          </button>
        )}
      </div>
      <div className="filtros">
        <Input label="Fecha" type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)}
          ayuda="El día se cuenta en hora de Bogotá" />
      </div>

      {valida && !actual && <p className="loading">Consultando...</p>}
      {!valida && <p className="ayuda-campo">Seleccione una fecha.</p>}
      <MensajeError mensaje={actual?.error ?? errorPdf} />

      {reporte && (
        <div role="region" aria-label={`Reporte del ${reporte.fecha}`} className="pagina">
          {reporte.mensaje && <p className="sin-resultados">{reporte.mensaje}</p>}
          <dl className="resumen">
            <div className={`principal${reporte.total === 0 ? " cero" : ""}`}><dt>Total vendido</dt><dd>{formatearPesos(reporte.total)}</dd></div>
            <div><dt>Subtotal</dt><dd>{formatearPesos(reporte.subtotal)}</dd></div>
            <div><dt>IVA</dt><dd>{formatearPesos(reporte.iva)}</dd></div>
            <div><dt>Facturas emitidas</dt><dd>{reporte.facturasEmitidas}</dd></div>
            <div><dt>Facturas anuladas</dt><dd>{reporte.facturasAnuladas}</dd></div>
            <div><dt>Unidades vendidas</dt><dd>{reporte.unidadesVendidas}</dd></div>
          </dl>
          {reporte.facturasAnuladas > 0 && (
            <p className="ayuda-campo">Las facturas anuladas aparecen en el listado, pero no suman en los totales.</p>
          )}

          {reporte.productos.length > 0 && (
            <>
              <h2>Productos vendidos</h2>
              <div className="table-container">
                <table aria-label="Productos vendidos">
                  <thead><tr><th>Código</th><th>Producto</th><th className="numero">Unidades</th><th className="numero">Subtotal</th><th className="numero">IVA</th><th className="numero">Total</th></tr></thead>
                  <tbody>
                    {reporte.productos.map(p => (
                      <tr key={p.codigo}>
                        <td>{p.codigo}</td><td>{p.nombre}</td><td className="numero">{p.cantidad}</td>
                        <td className="numero">{formatearPesos(p.subtotal)}</td><td className="numero">{formatearPesos(p.iva)}</td>
                        <td className="numero">{formatearPesos(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {reporte.facturas.length > 0 && (
            <>
              <h2>Facturas del día</h2>
              <div className="table-container">
                <table aria-label="Facturas del día">
                  <thead><tr><th>Número</th><th>Hora</th><th>Cliente</th><th>Vendedor</th><th className="numero">Total</th><th>Estado</th></tr></thead>
                  <tbody>
                    {reporte.facturas.map(f => (
                      <tr key={f.numero} className={f.anulada ? 'inactivo' : undefined}>
                        <td><Link to={`/facturas?numero=${encodeURIComponent(f.numero)}`}>{f.numero}</Link></td>
                        <td>{HORA.format(new Date(f.fecha))}</td><td>{f.cliente}</td><td>{f.vendedor}</td>
                        <td className="numero">{formatearPesos(f.total)}</td>
                        <td>{f.anulada ? <span className="badge badge-danger">Anulada</span> : 'Emitida'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
