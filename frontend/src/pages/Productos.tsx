import { useEffect, useState } from 'react'
import { activarProducto, buscarProductos, desactivarProducto } from '../api/catalogo'
import type { BusquedaProductosResponse, ProductoResponse } from '../api/domain'
import { useAuth } from '../auth/useAuth'
import { Confirmacion } from '../components/Confirmacion'
import { MensajeError } from '../components/FormFields'
import { useDebounce } from '../hooks/useDebounce'
import { formatearPesos } from '../lib/formato'
import { ProductoFormulario } from './ProductoFormulario'

const MINIMO_CARACTERES = 2
const POR_PAGINA = 50

type Edicion = { modo: 'nuevo' } | { modo: 'editar'; producto: ProductoResponse } | null

/** Product catalog (HU-8, RF-04 to RF-09): real-time search for everyone, management for ADMIN. */
export function Productos() {
  const { hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')

  const [texto, setTexto] = useState('')
  const [soloActivos, setSoloActivos] = useState(false)
  const [bajoStock, setBajoStock] = useState(false)
  const q = useDebounce(texto.trim(), 300)

  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; r?: BusquedaProductosResponse; error?: string } | null>(null)
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<Edicion>(null)
  const [porDesactivar, setPorDesactivar] = useState<ProductoResponse | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Avoids downloading the whole catalog: search only with 2+ characters or with a filter on (T4.4).
  const puedeBuscar = q.length >= MINIMO_CARACTERES || soloActivos || bajoStock
  // Identifies the search on screen; "version" forces a new one after saving or toggling a product.
  const clave = JSON.stringify([q, soloActivos, bajoStock, version])

  useEffect(() => {
    if (!puedeBuscar) return
    let vigente = true // ignore answers that arrive after a newer search started
    buscarProductos({ q, soloActivos, bajoStock })
      .then(r => {
        if (!vigente) return
        setRespuesta({ clave, r })
        setVisibles(POR_PAGINA)
      })
      .catch(e => vigente && setRespuesta({ clave, error: e instanceof Error ? e.message : 'No se pudo buscar' }))
    return () => {
      vigente = false
    }
  }, [clave, puedeBuscar, q, soloActivos, bajoStock])

  const actual = puedeBuscar && respuesta?.clave === clave ? respuesta : null
  const cargando = puedeBuscar && !actual
  const resultado = actual?.r ?? null

  const alGuardar = (p: ProductoResponse) => {
    setEdicion(null)
    setAviso(`Producto ${p.codigo} guardado`)
    setVersion(v => v + 1)
  }

  const cambiarEstado = async (p: ProductoResponse) => {
    setOcupado(true)
    setError(null)
    try {
      const r = p.activo ? await desactivarProducto(p.codigo) : await activarProducto(p.codigo)
      setAviso(`Producto ${r.codigo} ${r.activo ? 'reactivado' : 'desactivado'}`)
      setPorDesactivar(null)
      setVersion(v => v + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
    } finally {
      setOcupado(false)
    }
  }

  const productos = resultado?.productos ?? []

  return (
    <section className="pagina">
      <div className="pagina-encabezado">
        <h1>Productos</h1>
        {esAdmin && !edicion && (
          <button type="button" className="btn btn-primary btn-nuevo" onClick={() => { setAviso(null); setEdicion({ modo: 'nuevo' }) }}>
            Nuevo producto
          </button>
        )}
      </div>

      {aviso && <p className="aviso" role="status">{aviso}</p>}

      {edicion && (
        <ProductoFormulario
          key={edicion.modo === 'editar' ? edicion.producto.codigo : 'nuevo'}
          producto={edicion.modo === 'editar' ? edicion.producto : undefined}
          onGuardado={alGuardar}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {porDesactivar && (
        <Confirmacion
          titulo={`¿Desactivar ${porDesactivar.codigo}?`}
          confirmar="Desactivar"
          ocupado={ocupado}
          onConfirmar={() => void cambiarEstado(porDesactivar)}
          onCancelar={() => setPorDesactivar(null)}
        >
          <p>
            «{porDesactivar.nombre}» dejará de venderse y de comprarse. Su historial de facturas y compras se
            conserva, y se puede reactivar cuando quiera.
          </p>
        </Confirmacion>
      )}

      <div className="filtros" role="search">
        <label htmlFor="buscar-producto">Buscar por código, nombre o proveedor</label>
        <input
          id="buscar-producto"
          type="search"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ej.: martillo, MAR-01"
          autoFocus
        />
        <label><input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} /> Solo activos</label>
        <label><input type="checkbox" checked={bajoStock} onChange={e => setBajoStock(e.target.checked)} /> Solo stock bajo</label>
      </div>

      <MensajeError mensaje={error ?? actual?.error ?? null} />

      {!puedeBuscar && <p className="ayuda-campo">Escriba al menos {MINIMO_CARACTERES} caracteres o active un filtro.</p>}
      {cargando && <p className="loading">Buscando...</p>}
      {resultado && !cargando && resultado.total === 0 && (
        <p className="sin-resultados">{resultado.mensaje ?? 'No se encontraron productos'}</p>
      )}

      {productos.length > 0 && (
        <>
          <p className="ayuda-campo">
            {resultado!.total} {resultado!.total === 1 ? 'producto' : 'productos'}
            {resultado!.total > visibles && `; se muestran los primeros ${visibles}`}
          </p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Nombre</th><th>Proveedor</th><th className="numero">Precio base</th><th>IVA</th>
                  <th className="numero">Precio final</th><th className="numero">Stock</th><th>Estado</th>{esAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {productos.slice(0, visibles).map(p => (
                  <tr key={p.codigo} className={p.activo ? undefined : 'inactivo'}>
                    <td>{p.codigo}</td>
                    <td>{p.nombre}</td>
                    <td>{p.proveedorNombre}</td>
                    <td className="numero">{formatearPesos(p.precioBase)}</td>
                    <td>{p.aplicaIva ? '19 %' : 'No'}</td>
                    <td className="numero">{formatearPesos(p.precioFinal)}</td>
                    <td className="numero">
                      {p.stock} {p.stockBajo && <span className="badge badge-warning">Stock bajo</span>}
                    </td>
                    <td>{p.activo ? 'Activo' : 'Inactivo'}</td>
                    {esAdmin && (
                      <td className="acciones">
                        <button type="button" className="btn btn-secondary" onClick={() => { setAviso(null); setEdicion({ modo: 'editar', producto: p }) }}>
                          Editar
                        </button>
                        {p.activo ? (
                          <button type="button" className="btn btn-danger" onClick={() => setPorDesactivar(p)}>Desactivar</button>
                        ) : (
                          <button type="button" className="btn btn-secondary" onClick={() => void cambiarEstado(p)} disabled={ocupado}>
                            Reactivar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultado!.total > visibles && (
            <button type="button" className="btn btn-secondary" onClick={() => setVisibles(v => v + POR_PAGINA)}>
              Ver más
            </button>
          )}
        </>
      )}

      {esAdmin && !edicion && (
        <button type="button" className="btn btn-primary btn-nuevo-fin" onClick={() => { setAviso(null); setEdicion({ modo: 'nuevo' }) }}>
          Nuevo producto
        </button>
      )}
    </section>
  )
}
