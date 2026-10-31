import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarProductos } from '../api/catalogo'
import type { BusquedaProductosResponse, ReporteDiarioResponse } from '../api/domain'
import { reporteDiario } from '../api/reportes'
import { useAuth } from '../auth/useAuth'
import { MensajeError } from '../components/FormFields'
import { hoyEnBogota } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'

const DIA = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })
const MAXIMO_STOCK_BAJO = 6

type Resultado<T> = { datos?: T; error?: string } | null

/**
 * Home: what the counter needs to know right now. Everyone sees the products running out (they decide what
 * to offer and what to reorder); ADMIN also sees today's figures from the daily report.
 */
export function Dashboard() {
  const { user, hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const [stock, setStock] = useState<Resultado<BusquedaProductosResponse>>(null)
  const [hoy, setHoy] = useState<Resultado<ReporteDiarioResponse>>(null)
  const [fecha] = useState(() => DIA.format(new Date()).replace(/^./, c => c.toUpperCase()))

  useEffect(() => {
    let vigente = true
    buscarProductos({ soloActivos: true, bajoStock: true })
      .then(datos => vigente && setStock({ datos }))
      .catch(e => vigente && setStock({ error: e instanceof Error ? e.message : 'No se pudo consultar el stock' }))
    if (esAdmin) {
      reporteDiario(hoyEnBogota())
        .then(datos => vigente && setHoy({ datos }))
        .catch(e => vigente && setHoy({ error: e instanceof Error ? e.message : 'No se pudo consultar el día' }))
    }
    return () => {
      vigente = false
    }
  }, [esAdmin])

  const bajos = [...(stock?.datos?.productos ?? [])].sort((a, b) => a.stock - b.stock)
  const reporte = hoy?.datos

  return (
    <section className="pagina">
      <div className="pagina-encabezado">
        <div>
          <h1>Inicio</h1>
          <p className="subtitulo">
            {fecha} · {user?.username}
          </p>
        </div>
        <div className="inicio-acciones">
          <Link to="/vender" className="btn btn-primary">Nueva venta</Link>
          <Link to="/productos" className="btn btn-secondary">Buscar producto</Link>
        </div>
      </div>

      {esAdmin && (
        <section aria-labelledby="titulo-hoy" className="pagina">
          <div className="pagina-encabezado">
            <h2 id="titulo-hoy">Ventas de hoy</h2>
            <Link to="/reporte">Ver reporte del día</Link>
          </div>
          <MensajeError mensaje={hoy?.error ?? null} />
          {!hoy && <p className="loading">Consultando...</p>}
          {reporte && (
            <dl className="resumen">
              <div className={`principal${reporte.total === 0 ? ' cero' : ''}`}><dt>Total vendido</dt><dd>{formatearPesos(reporte.total)}</dd></div>
              <div><dt>Facturas emitidas</dt><dd>{reporte.facturasEmitidas}</dd></div>
              <div><dt>Unidades vendidas</dt><dd>{reporte.unidadesVendidas}</dd></div>
              <div><dt>Facturas anuladas</dt><dd>{reporte.facturasAnuladas}</dd></div>
            </dl>
          )}
        </section>
      )}

      <section aria-labelledby="titulo-stock" className="card inicio-stock">
        <div className="pagina-encabezado">
          <h2 id="titulo-stock">Stock bajo</h2>
          {bajos.length > 0 && (
            <Link to="/productos">
              {bajos.length > MAXIMO_STOCK_BAJO ? `Ver los ${bajos.length}` : 'Ir al catálogo'}
            </Link>
          )}
        </div>
        <MensajeError mensaje={stock?.error ?? null} />
        {!stock && <p className="loading">Consultando...</p>}
        {stock?.datos && bajos.length === 0 && (
          <p className="sin-resultados">Ningún producto activo tiene 5 unidades o menos.</p>
        )}
        {bajos.length > 0 && (
          <ul className="lista-simple">
            {bajos.slice(0, MAXIMO_STOCK_BAJO).map(p => (
              <li key={p.codigo}>
                <span>
                  {p.nombre}
                  <br />
                  <span className="meta">{p.codigo} · {p.proveedorNombre}</span>
                </span>
                <span className="numero">
                  {p.stock === 0 ? <span className="badge badge-danger">Agotado</span> : <><strong>{p.stock}</strong> <span className="meta">unid.</span></>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
