import { useEffect, useState } from 'react'
import { activarProducto, buscarProductos, desactivarProducto } from '../api/catalogo'
import type { BusquedaProductosResponse, ProductoResponse } from '../api/domain'
import { useAuth } from '../auth/useAuth'
import { Confirmacion } from '../components/Confirmacion'
import { MensajeError } from '../components/FormFields'
import { useDebounce } from '../hooks/useDebounce'
import { formatearPesos } from '../lib/formato'
import { ProductoFormulario } from './ProductoFormulario'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/checkbox'
import { cn } from '@/lib/utils'

const MINIMO_CARACTERES = 2
const POR_PAGINA = 50

type Edicion = { modo: 'nuevo' } | { modo: 'editar'; producto: ProductoResponse } | null

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

  const puedeBuscar = q.length >= MINIMO_CARACTERES || soloActivos || bajoStock
  const clave = JSON.stringify([q, soloActivos, bajoStock, version])

  useEffect(() => {
    if (!puedeBuscar) return
    let vigente = true
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
    <section className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">Catálogo, precios y stock.</p>
        </div>
        {esAdmin && !edicion && (
          <Button type="button" size="sm" onClick={() => { setAviso(null); setEdicion({ modo: 'nuevo' }) }}>
            Nuevo producto
          </Button>
        )}
      </div>

      {aviso && <p role="status" className="rounded-md border border-border bg-[var(--pill-positive-bg)] px-3 py-2 text-sm text-[var(--pill-positive-ink)]">{aviso}</p>}

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

      <div className="flex flex-col sm:flex-row sm:items-end gap-3" role="search">
        <div className="flex-1">
          <label htmlFor="buscar-producto" className="sr-only">Buscar por código, nombre o proveedor</label>
          <Input
            id="buscar-producto"
            type="search"
            value={texto}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTexto(e.target.value)}
            placeholder="Ej.: martillo, MAR-01"
            autoFocus
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={soloActivos} onCheckedChange={(v: boolean | 'indeterminate') => setSoloActivos(!!v)} />
          Solo activos
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={bajoStock} onCheckedChange={(v: boolean | 'indeterminate') => setBajoStock(!!v)} />
          Solo stock bajo
        </label>
      </div>

      <MensajeError mensaje={error ?? actual?.error ?? null} />

      {!puedeBuscar && <p className="text-sm text-muted-foreground">Escriba al menos {MINIMO_CARACTERES} caracteres o active un filtro.</p>}
      {cargando && <div className="skeleton h-40 w-full" aria-hidden="true" />}
      {resultado && !cargando && resultado.total === 0 && (
        <p className="text-sm text-muted-foreground">{resultado.mensaje ?? 'No se encontraron productos'}</p>
      )}

      {productos.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {resultado!.total} {resultado!.total === 1 ? 'producto' : 'productos'}
            {resultado!.total > visibles && `; se muestran los primeros ${visibles}`}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Catálogo de productos</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-left font-medium">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-right font-medium">Precio base</th>
                  <th className="px-3 py-2 text-left font-medium">IVA</th>
                  <th className="px-3 py-2 text-right font-medium">Precio final</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                  {esAdmin && <th className="px-3 py-2 text-left font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productos.slice(0, visibles).map(p => (
                  <tr key={p.codigo} className={cn(!p.activo && 'opacity-50')}>
                    <td className="px-3 py-2">{p.codigo}</td>
                    <td className="px-3 py-2">{p.nombre}</td>
                    <td className="px-3 py-2">{p.proveedorNombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(p.precioBase)}</td>
                    <td className="px-3 py-2">{p.aplicaIva ? '19 %' : 'No'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(p.precioFinal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.stock} {p.stockBajo && <span className="ml-1 inline-flex items-center rounded-full border border-[var(--pill-warning-line)] bg-[var(--pill-warning-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--pill-warning-ink)]">Stock bajo</span>}
                    </td>
                    <td className="px-3 py-2">{p.activo ? 'Activo' : 'Inactivo'}</td>
                    {esAdmin && (
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setAviso(null); setEdicion({ modo: 'editar', producto: p }) }}>
                            Editar
                          </Button>
                          {p.activo ? (
                            <Button type="button" variant="destructive" size="sm" onClick={() => setPorDesactivar(p)}>Desactivar</Button>
                          ) : (
                            <Button type="button" variant="secondary" size="sm" onClick={() => void cambiarEstado(p)} disabled={ocupado}>
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultado!.total > visibles && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setVisibles(v => v + POR_PAGINA)}>
              Ver más
            </Button>
          )}
        </>
      )}

    </section>
  )
}