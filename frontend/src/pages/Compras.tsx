import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { listarProveedores } from '../api/catalogo'
import { listarCompras, obtenerCompra, registrarCompra, type FiltrosCompras } from '../api/compras'
import type { CompraResponse, ProductoResponse, ProveedorResponse } from '../api/domain'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { Input, MensajeError, Select } from '../components/FormFields'
import { formatearDia, hoyEnBogota } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'
import {
  ETIQUETAS_COMPRA, erroresDesdeServidor, hayErrores, validarLineaCompra,
  type CampoCompra, type ErroresCampo, type ErroresLineaCompra,
} from '../lib/validacion'

interface Linea {
  producto: ProductoResponse
  cantidad: string
  precioCompra: string
}

const aNumero = (t: string) => Number(t.trim().replace(',', '.'))

/** Registers a purchase from a supplier (HU-10, RF-18): on confirmation the stock of each product goes up. */
function RegistrarCompra({ proveedores, onRegistrada }: { proveedores: ProveedorResponse[]; onRegistrada: (c: CompraResponse) => void }) {
  const hoy = hoyEnBogota()
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [lineas, setLineas] = useState<Linea[]>([])
  const [errores, setErrores] = useState<ErroresCampo<CampoCompra>>({})
  const [erroresLinea, setErroresLinea] = useState<Record<string, ErroresLineaCompra>>({})
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const agregar = (p: ProductoResponse) => {
    setError(null)
    if (lineas.some(l => l.producto.codigo === p.codigo)) {
      setAviso(`${p.codigo} ya está en la compra: cambie su cantidad en la tabla.`)
      return
    }
    setAviso(null)
    setLineas(ls => [...ls, { producto: p, cantidad: '1', precioCompra: '' }])
  }

  const cambiar = (codigo: string, campo: 'cantidad' | 'precioCompra', valor: string) => {
    setLineas(ls => ls.map(l => (l.producto.codigo === codigo ? { ...l, [campo]: valor } : l)))
    setErroresLinea(e => ({ ...e, [codigo]: { ...e[codigo], [campo]: undefined } }))
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)
    const generales: ErroresCampo<CampoCompra> = {}
    if (!proveedorId) generales.proveedorId = 'Seleccione el proveedor'
    if (!fecha) generales.fecha = 'Indique la fecha'
    else if (fecha > hoy) generales.fecha = 'La fecha no puede ser futura'
    const porLinea = Object.fromEntries(
      lineas.map(l => [l.producto.codigo, validarLineaCompra({ codigo: l.producto.codigo, cantidad: l.cantidad, precioCompra: l.precioCompra })]),
    )
    setErrores(generales)
    setErroresLinea(porLinea)
    if (lineas.length === 0) setError('Agregue al menos un producto')
    if (hayErrores(generales) || lineas.length === 0 || Object.values(porLinea).some(hayErrores)) return

    setEnviando(true)
    try {
      const compra = await registrarCompra({
        proveedorId: Number(proveedorId),
        fecha,
        items: lineas.map(l => ({ codigo: l.producto.codigo, cantidad: Number(l.cantidad.trim()), precioCompra: aNumero(l.precioCompra) })),
      })
      setLineas([])
      setProveedorId('')
      setFecha(hoyEnBogota())
      setErroresLinea({})
      onRegistrada(compra)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const porCampo = erroresDesdeServidor(err.message, ETIQUETAS_COMPRA)
        setErrores(porCampo)
        if (!hayErrores(porCampo)) setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo registrar la compra')
      }
    } finally {
      setEnviando(false)
    }
  }

  const estimado = lineas.reduce((s, l) => {
    const precio = aNumero(l.precioCompra)
    const cantidad = Number(l.cantidad)
    return Number.isFinite(precio) && Number.isFinite(cantidad) ? s + Math.round(precio * 100) * cantidad : s
  }, 0) / 100

  return (
    <form className="card formulario-ancho" onSubmit={enviar} noValidate aria-label="Registrar compra">
      <h2>Registrar compra</h2>
      <div className="fila-campos">
        <Select label="Proveedor" value={proveedorId} error={errores.proveedorId}
          opciones={proveedores.map(p => ({ value: String(p.id), label: p.nombre }))}
          onChange={e => { setProveedorId(e.target.value); setErrores(x => ({ ...x, proveedorId: undefined })) }} />
        <Input label="Fecha de la compra" type="date" value={fecha} max={hoy} error={errores.fecha}
          onChange={e => { setFecha(e.target.value); setErrores(x => ({ ...x, fecha: undefined })) }} />
      </div>

      <BuscadorProductos label="Agregar producto a la compra" onElegir={agregar} />
      {aviso && <p className="ayuda-campo" role="status">{aviso}</p>}

      {lineas.length > 0 && (
        <div className="table-container">
          <table aria-label="Productos de la compra">
            <thead><tr><th>Código</th><th>Producto</th><th>Stock actual</th><th>Cantidad</th><th>Precio de compra (unidad)</th><th></th></tr></thead>
            <tbody>
              {lineas.map(l => {
                const e = erroresLinea[l.producto.codigo] ?? {}
                return (
                  <tr key={l.producto.codigo}>
                    <td>{l.producto.codigo}</td>
                    <td>{l.producto.nombre}</td>
                    <td className="numero">{l.producto.stock}</td>
                    <td>
                      <input inputMode="numeric" value={l.cantidad} aria-label={`Cantidad de ${l.producto.codigo}`}
                        aria-invalid={e.cantidad ? true : undefined} aria-describedby={e.cantidad ? `cant-${l.producto.codigo}` : undefined}
                        onChange={ev => cambiar(l.producto.codigo, 'cantidad', ev.target.value)} />
                      {e.cantidad && <div id={`cant-${l.producto.codigo}`} className="error-campo">{e.cantidad}</div>}
                    </td>
                    <td>
                      <input inputMode="decimal" value={l.precioCompra} placeholder="18000.00" aria-label={`Precio de compra de ${l.producto.codigo}`}
                        aria-invalid={e.precioCompra ? true : undefined} aria-describedby={e.precioCompra ? `precio-${l.producto.codigo}` : undefined}
                        onChange={ev => cambiar(l.producto.codigo, 'precioCompra', ev.target.value)} />
                      {e.precioCompra && <div id={`precio-${l.producto.codigo}`} className="error-campo">{e.precioCompra}</div>}
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary" aria-label={`Quitar ${l.producto.codigo}`}
                        onClick={() => setLineas(ls => ls.filter(x => x !== l))}>Quitar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="total-estimado">
            Total estimado: <strong>{formatearPesos(estimado)}</strong>
            <span className="ayuda-campo"> (el total oficial lo calcula el servidor)</span>
          </p>
        </div>
      )}

      <MensajeError mensaje={error} />
      <div className="acciones">
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Registrando...' : 'Registrar compra'}</button>
      </div>
    </form>
  )
}

function DetalleCompra({ compra, onCerrar }: { compra: CompraResponse; onCerrar: () => void }) {
  return (
    <div className="card" role="region" aria-label={`Compra ${compra.codigo}`}>
      <h3>Compra {compra.codigo}</h3>
      <p>{compra.proveedorNombre} · {formatearDia(compra.fecha)} · Registrada por {compra.registradaPor}</p>
      <div className="table-container">
        <table>
          <thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr></thead>
          <tbody>
            {compra.lineas.map(l => (
              <tr key={l.codigo}>
                <td>{l.codigo}</td><td>{l.nombre}</td><td className="numero">{l.cantidad}</td>
                <td className="numero">{formatearPesos(l.precioUnitario)}</td><td className="numero">{formatearPesos(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="total-estimado">Total: <strong>{formatearPesos(compra.total)}</strong></p>
      <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
    </div>
  )
}

/** Purchases (HU-10): ADMIN only. The route is already wrapped in <SoloAdmin> in App.tsx. */
export function Compras() {
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([])
  const [borrador, setBorrador] = useState<FiltrosCompras>({})
  const [filtros, setFiltros] = useState<FiltrosCompras>({})
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; compras?: CompraResponse[]; error?: string } | null>(null)
  const [detalle, setDetalle] = useState<CompraResponse | null>(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const clave = JSON.stringify([filtros, version])

  useEffect(() => {
    listarProveedores()
      .then(setProveedores)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudieron cargar los proveedores'))
  }, [])

  useEffect(() => {
    let vigente = true
    listarCompras(filtros)
      .then(compras => vigente && setRespuesta({ clave, compras }))
      .catch(e => vigente && setRespuesta({ clave, error: e instanceof Error ? e.message : 'No se pudieron cargar las compras' }))
    return () => {
      vigente = false
    }
  }, [clave, filtros])

  const actual = respuesta?.clave === clave ? respuesta : null

  const alRegistrar = (c: CompraResponse) => {
    const productos = c.lineas.length
    setAviso(`Compra ${c.codigo} registrada: el stock de ${productos} ${productos === 1 ? 'producto aumentó' : 'productos aumentó'}.`)
    setDetalle(c)
    setVersion(v => v + 1)
  }

  const buscarPorCodigo = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^CMP-\d{6}$/i.test(codigo.trim())) {
      setError('Escriba el código completo, por ejemplo CMP-000001')
      return
    }
    try {
      setDetalle(await obtenerCompra(codigo))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar la compra')
    }
  }

  return (
    <section className="pagina">
      <h1>Compras a proveedores</h1>
      {aviso && <p className="aviso" role="status">{aviso}</p>}
      <RegistrarCompra proveedores={proveedores} onRegistrada={alRegistrar} />
      {detalle && <DetalleCompra compra={detalle} onCerrar={() => setDetalle(null)} />}

      <h2>Historial de compras</h2>
      <form className="filtros" onSubmit={e => { e.preventDefault(); setFiltros(borrador) }} aria-label="Filtros de compras">
        <Select label="Filtrar por proveedor" vacio="Todos" value={borrador.proveedorId ?? ''}
          opciones={proveedores.map(p => ({ value: String(p.id), label: p.nombre }))}
          onChange={e => setBorrador(b => ({ ...b, proveedorId: e.target.value }))} />
        <Input label="Desde" type="date" value={borrador.desde ?? ''} onChange={e => setBorrador(b => ({ ...b, desde: e.target.value }))} />
        <Input label="Hasta" type="date" value={borrador.hasta ?? ''} onChange={e => setBorrador(b => ({ ...b, hasta: e.target.value }))} />
        <Input label="Código de producto" value={borrador.producto ?? ''}
          onChange={e => setBorrador(b => ({ ...b, producto: e.target.value.toUpperCase() }))} />
        <button type="submit" className="btn btn-secondary">Filtrar</button>
      </form>
      <form className="filtros" onSubmit={buscarPorCodigo} aria-label="Buscar compra por código">
        <Input label="Código de compra" value={codigo} placeholder="CMP-000001" onChange={e => setCodigo(e.target.value.toUpperCase())} />
        <button type="submit" className="btn btn-secondary">Ver compra</button>
      </form>

      <MensajeError mensaje={error ?? actual?.error ?? null} />
      {!actual && <p className="loading">Cargando...</p>}
      {actual?.compras && actual.compras.length === 0 && <p className="sin-resultados">No hay compras con esos filtros</p>}
      {actual?.compras && actual.compras.length > 0 && (
        <div className="table-container">
          <table aria-label="Historial de compras">
            <thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Total</th><th>Registró</th><th></th></tr></thead>
            <tbody>
              {actual.compras.map(c => (
                <tr key={c.codigo}>
                  <td>{c.codigo}</td><td>{formatearDia(c.fecha)}</td><td>{c.proveedorNombre}</td>
                  <td className="numero">{c.lineas.length}</td><td className="numero">{formatearPesos(c.total)}</td><td>{c.registradaPor}</td>
                  <td><button type="button" className="btn btn-secondary" onClick={() => setDetalle(c)}>Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
