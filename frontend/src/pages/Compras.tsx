import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { listarTodosProveedores } from '../api/catalogo'
import { listarCompras, obtenerCompra, registrarCompra, type FiltrosCompras } from '../api/compras'
import type { CompraResponse, ComprasResponse, ProductoResponse, ProveedorResponse } from '../api/domain'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { CampoSelect, CampoTexto } from '../components/Campo'
import { MensajeError } from '../components/FormFields'
import { Paginador } from '../components/Paginador'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { usePaginaUrl } from '../hooks/usePaginaUrl'
import { formatearDia, hoyEnBogota } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'
import { paginaValida } from '../lib/paginacion'
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
    <form className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" onSubmit={enviar} noValidate
      aria-label="Registrar compra">
      <h2 className="text-base font-semibold">Registrar compra</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect id="compra-proveedor" label="Proveedor" value={proveedorId} error={errores.proveedorId}
          onChange={e => { setProveedorId(e.target.value); setErrores(x => ({ ...x, proveedorId: undefined })) }}>
          <option value="">Seleccione…</option>
          {proveedores.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
        </CampoSelect>
        <CampoTexto id="compra-fecha" label="Fecha de la compra" type="date" value={fecha} max={hoy} error={errores.fecha}
          onChange={e => { setFecha(e.target.value); setErrores(x => ({ ...x, fecha: undefined })) }} />
      </div>

      <BuscadorProductos label="Agregar producto a la compra" onElegir={agregar} />
      {aviso && <p role="status" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{aviso}</p>}

      {lineas.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table aria-label="Productos de la compra" className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Código</th>
                <th className="px-3 py-2 text-left font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Stock actual</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Precio de compra (unidad)</th>
                <th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineas.map(l => {
                const e = erroresLinea[l.producto.codigo] ?? {}
                return (
                  <tr key={l.producto.codigo}>
                    <td className="px-3 py-2">{l.producto.codigo}</td>
                    <td className="px-3 py-2">{l.producto.nombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.producto.stock}</td>
                    <td className="px-3 py-2">
                      <input inputMode="numeric" value={l.cantidad} aria-label={`Cantidad de ${l.producto.codigo}`}
                        aria-invalid={e.cantidad ? true : undefined}
                        aria-describedby={e.cantidad ? `cant-${l.producto.codigo}` : undefined}
                        onChange={ev => cambiar(l.producto.codigo, 'cantidad', ev.target.value)}
                        className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                      {e.cantidad && <p id={`cant-${l.producto.codigo}`} className="mt-1 text-right text-xs text-destructive">{e.cantidad}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <input inputMode="decimal" value={l.precioCompra} placeholder="18000.00" aria-label={`Precio de compra de ${l.producto.codigo}`}
                        aria-invalid={e.precioCompra ? true : undefined}
                        aria-describedby={e.precioCompra ? `precio-${l.producto.codigo}` : undefined}
                        onChange={ev => cambiar(l.producto.codigo, 'precioCompra', ev.target.value)}
                        className="h-8 w-28 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                      {e.precioCompra && <p id={`precio-${l.producto.codigo}`} className="mt-1 text-right text-xs text-destructive">{e.precioCompra}</p>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="ghost" size="sm" aria-label={`Quitar ${l.producto.codigo}`}
                        onClick={() => setLineas(ls => ls.filter(x => x !== l))}>
                        Quitar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-baseline justify-end gap-2 border-t border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total estimado:</span>
            <strong className="text-lg tabular-nums">{formatearPesos(estimado)}</strong>
            <span className="text-xs text-muted-foreground">(el total oficial lo calcula el servidor)</span>
          </div>
        </div>
      )}

      <MensajeError mensaje={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>{enviando ? 'Registrando...' : 'Registrar compra'}</Button>
      </div>
    </form>
  )
}

function DetalleCompra({ compra, onCerrar }: { compra: CompraResponse; onCerrar: () => void }) {
  return (
    <Card role="region" aria-label={`Compra ${compra.codigo}`} className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Compra {compra.codigo}</h3>
          <p className="text-sm text-muted-foreground">
            {compra.proveedorNombre} · {formatearDia(compra.fecha)} · Registrada por {compra.registradaPor}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onCerrar}>Cerrar</Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Líneas de la compra {compra.codigo}</caption>
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Producto</th>
              <th className="px-3 py-2 text-right font-medium">Cantidad</th>
              <th className="px-3 py-2 text-right font-medium">Precio unitario</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {compra.lineas.map(l => (
              <tr key={l.codigo}>
                <td className="px-3 py-2">{l.codigo}</td>
                <td className="px-3 py-2">{l.nombre}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.cantidad}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(l.precioUnitario)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex items-baseline justify-end gap-2 text-sm">
        <span className="text-muted-foreground">Total:</span>
        <strong className="text-lg font-bold tabular-nums">{formatearPesos(compra.total)}</strong>
      </p>
    </Card>
  )
}

/** Purchases (HU-10): ADMIN only. The route is already wrapped in <SoloAdmin> in App.tsx. */
export function Compras() {
  const { params, pagina, actualizar, irAPagina } = usePaginaUrl('pagina')
  const filtros = useMemo<FiltrosCompras>(() => ({
    proveedorId: params.get('proveedorId') ?? '',
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
    producto: params.get('producto') ?? '',
  }), [params])
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([])
  const [borrador, setBorrador] = useState<FiltrosCompras>(filtros)
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; r?: ComprasResponse; error?: string } | null>(null)
  const [detalle, setDetalle] = useState<CompraResponse | null>(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const clave = JSON.stringify([filtros, pagina, version])

  useEffect(() => {
    listarTodosProveedores()
      .then(setProveedores)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudieron cargar los proveedores'))
  }, [])

  useEffect(() => {
    setBorrador(filtros)
  }, [filtros])

  useEffect(() => {
    let vigente = true
    listarCompras(filtros, pagina)
      .then(r => vigente && setRespuesta({ clave, r }))
      .catch(e => vigente && setRespuesta({ clave, error: e instanceof Error ? e.message : 'No se pudieron cargar las compras' }))
    return () => {
      vigente = false
    }
  }, [clave, filtros, pagina, version])

  const actual = respuesta?.clave === clave ? respuesta : null
  const resultado = actual?.r ?? null
  const compras = resultado?.compras ?? []

  useEffect(() => {
    if (!resultado || resultado.totalPaginas === 0) return
    const valida = paginaValida(pagina, resultado.totalPaginas)
    if (valida !== pagina) irAPagina(valida, true)
  }, [resultado, pagina, irAPagina])

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
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Compras a proveedores</h1>
        <p className="text-sm text-muted-foreground">Registra una compra y consulta el historial.</p>
      </header>

      {aviso && (
        <p role="status" className="rounded-md border border-border bg-[var(--pill-positive-bg)] px-3 py-2 text-sm text-[var(--pill-positive-ink)]">
          {aviso}
        </p>
      )}

      <RegistrarCompra proveedores={proveedores} onRegistrada={alRegistrar} />
      {detalle && <DetalleCompra compra={detalle} onCerrar={() => setDetalle(null)} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historial de compras</h2>

        <form aria-label="Filtros de compras" onSubmit={e => {
          e.preventDefault()
          actualizar({
            proveedorId: borrador.proveedorId?.trim() || null,
            desde: borrador.desde || null,
            hasta: borrador.hasta || null,
            producto: borrador.producto?.trim() || null,
            pagina: null,
          })
        }}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CampoSelect id="filtro-proveedor" label="Filtrar por proveedor" value={borrador.proveedorId ?? ''}
              onChange={e => setBorrador(b => ({ ...b, proveedorId: e.target.value }))}>
              <option value="">Todos</option>
              {proveedores.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
            </CampoSelect>
            <CampoTexto id="filtro-desde" label="Desde" type="date" value={borrador.desde ?? ''}
              onChange={e => setBorrador(b => ({ ...b, desde: e.target.value }))} />
            <CampoTexto id="filtro-hasta" label="Hasta" type="date" value={borrador.hasta ?? ''}
              onChange={e => setBorrador(b => ({ ...b, hasta: e.target.value }))} />
            <CampoTexto id="filtro-producto" label="Código de producto" value={borrador.producto ?? ''}
              onChange={e => setBorrador(b => ({ ...b, producto: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <Button type="submit" variant="secondary">Filtrar</Button>
          </div>
        </form>

        <form aria-label="Buscar compra por código" onSubmit={buscarPorCodigo}
          className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <CampoTexto id="buscar-compra" label="Código de compra" className="sm:max-w-xs" placeholder="CMP-000001"
            value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} />
          <Button type="submit" variant="secondary" className="min-h-[44px]">Ver compra</Button>
        </form>

        <MensajeError mensaje={error ?? actual?.error ?? null} />
        {!actual && <div className="skeleton h-40 w-full" aria-hidden="true" />}
        {resultado && compras.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay compras con esos filtros</p>
        )}
        {compras.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table aria-label="Historial de compras" className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-right font-medium">Productos</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-left font-medium">Registró</th>
                  <th className="px-3 py-2 text-right font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compras.map(c => (
                  <tr key={c.codigo}>
                    <td className="px-3 py-2">{c.codigo}</td>
                    <td className="px-3 py-2">{formatearDia(c.fecha)}</td>
                    <td className="px-3 py-2">{c.proveedorNombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.lineas.length}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(c.total)}</td>
                    <td className="px-3 py-2">{c.registradaPor}</td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setDetalle(c)}>Ver</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resultado && compras.length > 0 && (
          <Paginador
            pagina={resultado.pagina}
            totalPaginas={resultado.totalPaginas}
            total={resultado.total}
            etiqueta={resultado.total === 1 ? 'compra' : 'compras'}
            onCambiar={irAPagina}
          />
        )}
      </section>
    </section>
  )
}
