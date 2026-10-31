import { useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { FacturaResponse, ProductoResponse } from '../api/domain'
import { emitirFactura } from '../api/ventas'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { FacturaDetalle } from '../components/FacturaDetalle'
import { Input, MensajeError } from '../components/FormFields'
import { formatearPesos } from '../lib/formato'
import {
  ETIQUETAS_VENTA, erroresDesdeServidor, hayErrores, validarCliente,
  type CampoCliente, type ErroresCampo, type FormCliente,
} from '../lib/validacion'

interface LineaCarrito {
  producto: ProductoResponse
  cantidad: number
}

const CLIENTE_VACIO: FormCliente = { clienteNombre: '', clienteDireccion: '', clienteTelefono: '' }
const CANTIDAD_MAXIMA = 100_000
const vacio = (t: string) => (t.trim() ? t.trim() : null)

/**
 * Display-only estimate of the cart. Works in cents to avoid floating point drift, but it is NOT the
 * invoice total: VAT is computed per line by the server, which returns the official amounts.
 */
function estimar(carrito: LineaCarrito[]): number {
  const centavos = carrito.reduce((suma, l) => suma + Math.round(l.producto.precioFinal * 100) * l.cantidad, 0)
  return centavos / 100
}

/** Point of sale (HU-9, RF-10 to RF-15): autocomplete, cart, customer data and the issued invoice. */
export function PuntoVenta() {
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [cliente, setCliente] = useState<FormCliente>(CLIENTE_VACIO)
  const [errores, setErrores] = useState<ErroresCampo<CampoCliente>>({})
  const [error, setError] = useState<{ mensaje: string; detalles: string[] } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [factura, setFactura] = useState<FacturaResponse | null>(null)
  const enCurso = useRef(false) // blocks a double click before React re-renders the disabled button

  const agregar = (p: ProductoResponse) => {
    setError(null)
    setCarrito(c => {
      const existente = c.find(l => l.producto.codigo === p.codigo)
      if (existente) return c.map(l => (l === existente ? { ...l, cantidad: l.cantidad + 1 } : l))
      return [...c, { producto: p, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (codigo: string, texto: string) => {
    const n = Math.min(CANTIDAD_MAXIMA, Math.max(1, Math.trunc(Number(texto)) || 1))
    setCarrito(c => c.map(l => (l.producto.codigo === codigo ? { ...l, cantidad: n } : l)))
  }

  const quitar = (codigo: string) => setCarrito(c => c.filter(l => l.producto.codigo !== codigo))

  const cambiarCliente = (campo: CampoCliente, valor: string) => {
    setCliente(f => ({ ...f, [campo]: valor }))
    setErrores(e => ({ ...e, [campo]: undefined }))
  }

  const confirmar = async (e: FormEvent) => {
    e.preventDefault()
    if (enCurso.current || carrito.length === 0) return
    setError(null)
    const locales = validarCliente(cliente)
    setErrores(locales)
    if (hayErrores(locales)) return

    enCurso.current = true
    setEnviando(true)
    try {
      const emitida = await emitirFactura({
        clienteNombre: cliente.clienteNombre.trim(),
        clienteDireccion: vacio(cliente.clienteDireccion),
        clienteTelefono: vacio(cliente.clienteTelefono),
        items: carrito.map(l => ({ codigo: l.producto.codigo, cantidad: l.cantidad })),
      })
      setFactura(emitida)
    } catch (err) {
      // The cart is kept on purpose: the cashier fixes the quantities and confirms again.
      if (err instanceof ApiError && err.status === 400) {
        const porCampo = erroresDesdeServidor(err.message, ETIQUETAS_VENTA)
        setErrores(porCampo)
        if (!hayErrores(porCampo)) setError({ mensaje: err.message, detalles: [] })
      } else if (err instanceof ApiError) {
        setError({ mensaje: err.message, detalles: err.detalles })
      } else {
        setError({ mensaje: 'No se pudo conectar con el servidor. La venta no se registró.', detalles: [] })
      }
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  const nuevaVenta = () => {
    setFactura(null)
    setCarrito([])
    setCliente(CLIENTE_VACIO)
    setErrores({})
    setError(null)
  }

  if (factura) {
    return (
      <section className="pagina">
        <p className="aviso" role="status">Venta registrada: factura {factura.numero}</p>
        <FacturaDetalle
          factura={factura}
          acciones={<button type="button" className="btn btn-secondary" onClick={nuevaVenta} autoFocus>Nueva venta</button>}
        />
      </section>
    )
  }

  return (
    <section className="pagina punto-venta">
      <h1>Vender</h1>
      <BuscadorProductos label="Agregar producto" onElegir={agregar} exigirStock autoFocus />

      <form onSubmit={confirmar} noValidate aria-label="Venta">
        <div className="venta-carrito">
        <h2>Carrito</h2>
        {carrito.length === 0 ? (
          <p className="sin-resultados">El carrito está vacío. Busque un producto y presione Enter para agregarlo.</p>
        ) : (
          <div className="table-container">
            <table aria-label="Carrito">
              <thead>
                <tr><th>Código</th><th>Producto</th><th className="numero">Precio final</th><th className="numero">Cantidad</th><th className="numero">Estimado</th><th></th></tr>
              </thead>
              <tbody>
                {carrito.map(l => {
                  const excede = l.cantidad > l.producto.stock
                  return (
                    <tr key={l.producto.codigo}>
                      <td>{l.producto.codigo}</td>
                      <td>{l.producto.nombre}</td>
                      <td className="numero">{formatearPesos(l.producto.precioFinal)}</td>
                      <td className="numero">
                        <input
                          type="number"
                          min={1}
                          max={CANTIDAD_MAXIMA}
                          value={l.cantidad}
                          aria-label={`Cantidad de ${l.producto.codigo}`}
                          aria-invalid={excede || undefined}
                          aria-describedby={excede ? `excede-${l.producto.codigo}` : undefined}
                          onChange={e => cambiarCantidad(l.producto.codigo, e.target.value)}
                        />
                        {excede && (
                          <div id={`excede-${l.producto.codigo}`} className="error-campo">
                            Supera el stock disponible ({l.producto.stock})
                          </div>
                        )}
                      </td>
                      <td className="numero">{formatearPesos(Math.round(l.producto.precioFinal * 100) * l.cantidad / 100)}</td>
                      <td>
                        <button type="button" className="btn btn-secondary" onClick={() => quitar(l.producto.codigo)}
                          aria-label={`Quitar ${l.producto.codigo}`}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        </div>

        <div className="card venta-cobro">
        <h2>Cliente</h2>
        <Input label="Nombre del cliente" value={cliente.clienteNombre} error={errores.clienteNombre} maxLength={100}
          onChange={e => cambiarCliente('clienteNombre', e.target.value)} />
        <Input label="Dirección (opcional)" value={cliente.clienteDireccion} error={errores.clienteDireccion} maxLength={150}
          onChange={e => cambiarCliente('clienteDireccion', e.target.value)} />
        <Input label="Teléfono (opcional)" type="tel" value={cliente.clienteTelefono} error={errores.clienteTelefono}
          onChange={e => cambiarCliente('clienteTelefono', e.target.value)} />

        {carrito.length > 0 && (
          <p className="total-cobro">
            <span>Total estimado</span>
            <strong>{formatearPesos(estimar(carrito))}</strong>
          </p>
        )}
        {carrito.length > 0 && (
          <p className="ayuda-campo">El total oficial, con el IVA por línea, lo calcula el servidor al confirmar.</p>
        )}
        <MensajeError mensaje={error?.mensaje ?? null} detalles={error?.detalles} />
        <button type="submit" className="btn btn-primary btn-grande" disabled={enviando || carrito.length === 0}>
          {enviando ? 'Registrando venta...' : 'Confirmar venta'}
        </button>
        </div>
      </form>
    </section>
  )
}
