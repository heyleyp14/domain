import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { listarFacturas, obtenerFacturaDetalle, anularFacturaAdmin, pdfFacturaDetalle } from '../api/facturas'
import type { FacturaResponse } from '../api/domain'
import { formatearPesos } from '../lib/formato'

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })

export function Facturas() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('ADMIN')

  const [fecha, setFecha] = useState('')
  const [respuesta, setRespuesta] = useState<{ f?: FacturaResponse[]; error?: string } | null>(null)

  // Detail sidebar
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaResponse | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    listarFacturas(fecha || undefined)
      .then(f => {
        if (!vigente) return
        setRespuesta({ f })
      })
      .catch(err => {
        if (!vigente) return
        setRespuesta({ error: err instanceof Error ? err.message : 'No se pudo cargar la lista de facturas' })
      })
    return () => { vigente = false }
  }, [fecha])

  const facturas = respuesta?.f ?? []
  const error = respuesta?.error ?? null
  const cargando = fecha !== '' && !respuesta

  const verDetalle = async (numero: string) => {
    setCargandoDetalle(true)
    setErrorDetalle(null)
    try {
      const detalle = await obtenerFacturaDetalle(numero)
      setFacturaSeleccionada(detalle)
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : 'No se pudo cargar el detalle')
    } finally {
      setCargandoDetalle(false)
    }
  }

  const cerrarDetalle = () => setFacturaSeleccionada(null)

  const handleAnular = async (numero: string) => {
    const motivo = window.prompt('Motivo de la anulación (requerido):')
    if (!motivo?.trim()) return
    try {
      await anularFacturaAdmin(numero, motivo.trim())
      window.location.reload()
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : 'No se pudo anular la factura')
    }
  }

  const handleDescargar = async (numero: string) => {
    try {
      const { archivo, nombre } = await pdfFacturaDetalle(numero)
      const url = URL.createObjectURL(archivo)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : 'No se pudo descargar el PDF')
    }
  }

  return (
    <div className="facturas">
      <div className="page-header">
        <h1>Facturas</h1>
      </div>

      <section className="search-filters card">
        <div className="search-row">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="form-input"
            aria-label="Filtrar por fecha"
          />
        </div>
        {cargando && <div className="loading">Cargando…</div>}
      </section>

      <section className="results card">
        {error && <div className="error" role="alert">{error}</div>}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.numero} onClick={() => verDetalle(f.numero)} style={{ cursor: 'pointer' }}>
                  <td>{f.numero}</td>
                  <td>{FECHA.format(new Date(f.fecha))}</td>
                  <td>{f.clienteNombre}</td>
                  <td>{f.vendedor}</td>
                  <td className="center">
                    {f.estado === 'ANULADA'
                      ? <span className="badge badge-danger">Anulada</span>
                      : <span className="badge badge-success">Emitida</span>}
                  </td>
                  <td className="precio">{formatearPesos(f.total)}</td>
                  <td className="acciones">
                    {isAdmin && f.estado === 'EMITIDA' && (
                      <button
                        className="btn-link"
                        onClick={e => { e.stopPropagation(); handleAnular(f.numero); }}
                        title="Anular"
                      >
                        ⛔
                      </button>
                    )}
                    <button
                      className="btn-link"
                      onClick={e => { e.stopPropagation(); handleDescargar(f.numero); }}
                      title="Descargar PDF"
                    >
                      📄
                    </button>
                  </td>
                </tr>
              ))}
              {facturas.length === 0 && !cargando && !error && (
                <tr><td colSpan={7} className="sin-datos">No hay facturas</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {facturas.length > 0 && <p className="total-resultados">{facturas.length} factura{facturas.length !== 1 ? 's' : ''} encontrada{facturas.length !== 1 ? 's' : ''}</p>}
      </section>

      {/* Detail sidebar */}
      {facturaSeleccionada && (
        <aside className="sidebar card" role="dialog" aria-label={`Detalle de factura ${facturaSeleccionada.numero}`}>
          <header className="sidebar-header">
            <h2>Factura {facturaSeleccionada.numero}</h2>
            <button className="btn-close" onClick={cerrarDetalle} aria-label="Cerrar">✕</button>
          </header>
          <div className="sidebar-body">
            {cargandoDetalle && <div className="loading">Cargando detalle…</div>}
            {errorDetalle && <div className="error" role="alert">{errorDetalle}</div>}
            {!cargandoDetalle && !errorDetalle && (
              <>
                <p>
                  {FECHA.format(new Date(facturaSeleccionada.fecha))} · Vendedor: {facturaSeleccionada.vendedor}
                  <br />
                  Cliente: {facturaSeleccionada.clienteNombre}
                  {facturaSeleccionada.clienteDireccion && ` · ${facturaSeleccionada.clienteDireccion}`}
                  {facturaSeleccionada.clienteTelefono && ` · Tel. ${facturaSeleccionada.clienteTelefono}`}
                </p>
                {facturaSeleccionada.estado === 'ANULADA' && (
                  <p className="mensaje-error">
                    Anulada por {facturaSeleccionada.anuladaPor}
                    {facturaSeleccionada.anuladaEn && ` el ${FECHA.format(new Date(facturaSeleccionada.anuladaEn))}`}
                    . Motivo: {facturaSeleccionada.motivoAnulacion}
                  </p>
                )}
                <h3>Productos</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Cantidad</th>
                        <th>Precio base</th>
                        <th>Subtotal</th>
                        <th>IVA</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaSeleccionada.lineas.map(l => (
                        <tr key={l.codigo}>
                          <td>{l.codigo}</td>
                          <td>{l.nombre}</td>
                          <td className="numero">{l.cantidad}</td>
                          <td className="precio">{formatearPesos(l.precioBase)}</td>
                          <td className="precio">{formatearPesos(l.subtotal)}</td>
                          <td className="precio">{formatearPesos(l.iva)}</td>
                          <td className="precio">{formatearPesos(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="totales">
                  <dt>Subtotal</dt><dd>{formatearPesos(facturaSeleccionada.subtotal)}</dd>
                  <dt>IVA</dt><dd>{formatearPesos(facturaSeleccionada.iva)}</dd>
                  <dt>Total</dt><dd><strong>{formatearPesos(facturaSeleccionada.total)}</strong></dd>
                </dl>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}