import { useRef, useState, type FormEvent, useMemo } from 'react'
import { Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { ApiError } from '../api/client'
import type { FacturaResponse, ProductoResponse } from '../api/domain'
import { emitirFactura } from '../api/ventas'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { CampoTexto } from '../components/Campo'
import { FacturaDetalle } from '../components/FacturaDetalle'
import { MensajeError } from '../components/FormFields'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
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
const MOCK_CARRITO: LineaCarrito[] = [
  { producto: { codigo: 'PRD-001', nombre: 'Martillo de uña 16oz', precioBase: 25000, aplicaIva: true, precioFinal: 29750, stock: 15, stockBajo: false, activo: true, id: 1, proveedorId: 1, proveedorNombre: 'Ferretería Central', auditoria: { creadoPor: 'admin', creadoEn: '2024-01-01T00:00:00Z', modificadoPor: null, modificadoEn: null } }, cantidad: 2 },
  { producto: { codigo: 'PRD-002', nombre: 'Destornillador Phillips #2', precioBase: 8500, aplicaIva: true, precioFinal: 10115, stock: 30, stockBajo: false, activo: true, id: 2, proveedorId: 1, proveedorNombre: 'Ferretería Central', auditoria: { creadoPor: 'admin', creadoEn: '2024-01-01T00:00:00Z', modificadoPor: null, modificadoEn: null } }, cantidad: 1 },
  { producto: { codigo: 'PRD-003', nombre: 'Cinta métrica 5m', precioBase: 18000, aplicaIva: false, precioFinal: 18000, stock: 8, stockBajo: true, activo: true, id: 3, proveedorId: 2, proveedorNombre: 'Herramientas SAS', auditoria: { creadoPor: 'admin', creadoEn: '2024-01-01T00:00:00Z', modificadoPor: null, modificadoEn: null } }, cantidad: 3 },
]
const vacio = (t: string) => (t.trim() ? t.trim() : null)

/** Demo seed only: `?demo=1` in development. Production and tests always start with an empty cart. */
function carritoInicial(): LineaCarrito[] {
  if (!import.meta.env.DEV) return []
  return new URLSearchParams(window.location.search).has('demo') ? MOCK_CARRITO : []
}

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
  const [carrito, setCarrito] = useState<LineaCarrito[]>(carritoInicial)
  const [cliente, setCliente] = useState<FormCliente>(CLIENTE_VACIO)
  const [errores, setErrores] = useState<ErroresCampo<CampoCliente>>({})
  const [error, setError] = useState<{ mensaje: string; detalles: string[] } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [factura, setFactura] = useState<FacturaResponse | null>(null)
  const totalEstimado = useMemo(() => estimar(carrito), [carrito])
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

  const ajustarCantidad = (codigo: string, delta: number) => {
    setCarrito(c => c.map(l => {
      if (l.producto.codigo !== codigo) return l
      const nueva = Math.min(CANTIDAD_MAXIMA, Math.max(1, l.cantidad + delta))
      return { ...l, cantidad: nueva }
    }))
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

  const limpiarCarrito = () => {
    setCarrito([])
    setError(null)
    setErrores({})
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
      <section className="flex flex-col gap-4">
        <p role="status" className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          Venta registrada: factura {factura.numero}
        </p>
        <FacturaDetalle
          factura={factura}
          acciones={<Button type="button" variant="secondary" onClick={nuevaVenta} autoFocus>Nueva venta</Button>}
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vender</h1>
          <p className="text-sm text-muted-foreground">Arma el carrito, registra al cliente y confirma la venta.</p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {carrito.length} {carrito.length === 1 ? 'producto' : 'productos'} en el carrito
        </p>
      </header>

      <form onSubmit={confirmar} noValidate aria-label="Venta" className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <BuscadorProductos label="Agregar producto" onElegir={agregar} exigirStock autoFocus />
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 className="text-base font-semibold">Carrito</h2>
              {carrito.length > 0 && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {carrito.length} {carrito.length === 1 ? 'línea' : 'líneas'}
                </span>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">El carrito está vacío</p>
                <p className="max-w-sm text-sm text-muted-foreground">Busque un producto y presione Enter para agregarlo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table aria-label="Carrito" className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Producto</th>
                      <th className="px-4 py-2 text-right font-medium">Precio final</th>
                      <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                      <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-4 py-2"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {carrito.map(l => {
                      const excede = l.cantidad > l.producto.stock
                      const subtotal = Math.round(l.producto.precioFinal * 100) * l.cantidad / 100
                      return (
                        <tr key={l.producto.codigo} className="align-middle">
                          <td className="px-4 py-3">
                            <div className="font-medium">{l.producto.nombre}</div>
                            <div className="text-xs text-muted-foreground">{l.producto.codigo}</div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(l.producto.precioFinal)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => ajustarCantidad(l.producto.codigo, -1)}
                                aria-label={`Disminuir cantidad de ${l.producto.codigo}`}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <input
                                type="number"
                                min={1}
                                max={CANTIDAD_MAXIMA}
                                value={l.cantidad}
                                aria-label={`Cantidad de ${l.producto.codigo}`}
                                aria-invalid={excede || undefined}
                                aria-describedby={excede ? `excede-${l.producto.codigo}` : undefined}
                                onChange={e => cambiarCantidad(l.producto.codigo, e.target.value)}
                                className="h-8 w-14 rounded-md border border-input bg-background text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => ajustarCantidad(l.producto.codigo, 1)}
                                aria-label={`Aumentar cantidad de ${l.producto.codigo}`}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {excede && (
                              <p id={`excede-${l.producto.codigo}`} className="mt-1 text-right text-xs text-destructive">
                                Supera el stock disponible ({l.producto.stock})
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(subtotal)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                              onClick={() => quitar(l.producto.codigo)}
                              aria-label={`Quitar ${l.producto.codigo}`}>
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {carrito.length > 0 && (
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={limpiarCarrito}>Limpiar carrito</Button>
                <p className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
                  <span className="text-sm text-muted-foreground">Total estimado</span>
                  <strong className="text-xl font-bold tabular-nums">{formatearPesos(totalEstimado)}</strong>
                </p>
              </div>
            )}
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold">Cliente</CardTitle>
              <CardDescription>Solo el nombre es obligatorio; dirección y teléfono son opcionales.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-4 pt-0">
              <CampoTexto id="cliente-nombre" label="Nombre del cliente" value={cliente.clienteNombre} error={errores.clienteNombre}
                maxLength={100} onChange={e => cambiarCliente('clienteNombre', e.target.value)} />
              <CampoTexto id="cliente-direccion" label="Dirección (opcional)" value={cliente.clienteDireccion} error={errores.clienteDireccion}
                maxLength={150} onChange={e => cambiarCliente('clienteDireccion', e.target.value)} />
              <CampoTexto id="cliente-telefono" label="Teléfono (opcional)" type="tel" value={cliente.clienteTelefono} error={errores.clienteTelefono}
                onChange={e => cambiarCliente('clienteTelefono', e.target.value)} />
              <MensajeError mensaje={error?.mensaje ?? null} detalles={error?.detalles} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold">Resumen de venta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-4 pt-0">
              {carrito.length > 0 ? (
                <>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Subtotal productos</span>
                    <span className="tabular-nums">{formatearPesos(totalEstimado)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t pt-3">
                    <span className="font-medium">Total a pagar</span>
                    <strong className="text-2xl font-bold tabular-nums text-[var(--hue)]">{formatearPesos(totalEstimado)}</strong>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    El total oficial, con el IVA por línea, lo calcula el servidor al confirmar.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Agrega productos al carrito para ver el resumen.</p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={enviando || carrito.length === 0}>
                {enviando ? 'Registrando venta...' : 'Confirmar venta'}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </section>
  )
}
