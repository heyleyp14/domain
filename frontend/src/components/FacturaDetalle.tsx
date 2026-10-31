import { useState, type ReactNode } from 'react'
import type { FacturaResponse } from '../api/domain'
import { pdfFactura } from '../api/ventas'
import { guardarArchivo } from '../lib/descargar'
import { formatearPesos } from '../lib/formato'
import { MensajeError } from './FormFields'

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

  return (
    <article className="card factura" aria-label={`Factura ${factura.numero}`}>
      <header className="pagina-encabezado">
        <h2>Factura {factura.numero}</h2>
        {factura.estado === 'ANULADA' && <span className="badge badge-danger">ANULADA</span>}
      </header>
      <p>
        {FECHA.format(new Date(factura.fecha))} · Vendedor: {factura.vendedor}
        <br />
        Cliente: {factura.clienteNombre}
        {factura.clienteDireccion && ` · ${factura.clienteDireccion}`}
        {factura.clienteTelefono && ` · Tel. ${factura.clienteTelefono}`}
      </p>
      {factura.estado === 'ANULADA' && (
        <p className="mensaje-error">
          Anulada por {factura.anuladaPor}
          {factura.anuladaEn && ` el ${FECHA.format(new Date(factura.anuladaEn))}`}. Motivo: {factura.motivoAnulacion}
        </p>
      )}
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Código</th><th>Producto</th><th className="numero">Cantidad</th><th className="numero">Precio</th><th className="numero">Subtotal</th><th className="numero">IVA</th><th className="numero">Total</th></tr>
          </thead>
          <tbody>
            {factura.lineas.map(l => (
              <tr key={l.codigo}>
                <td>{l.codigo}</td><td>{l.nombre}</td><td className="numero">{l.cantidad}</td>
                <td className="numero">{formatearPesos(l.precioBase)}</td><td className="numero">{formatearPesos(l.subtotal)}</td>
                <td className="numero">{formatearPesos(l.iva)}</td><td className="numero">{formatearPesos(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="totales">
        <dt>Subtotal</dt><dd>{formatearPesos(factura.subtotal)}</dd>
        <dt>IVA</dt><dd>{formatearPesos(factura.iva)}</dd>
        <dt>Total</dt><dd><strong>{formatearPesos(factura.total)}</strong></dd>
      </dl>
      <MensajeError mensaje={error} />
      <div className="acciones">
        <button type="button" className="btn btn-primary" onClick={() => void descargar()} disabled={descargando}>
          {descargando ? 'Descargando...' : 'Descargar PDF'}
        </button>
        {acciones}
      </div>
    </article>
  )
}
