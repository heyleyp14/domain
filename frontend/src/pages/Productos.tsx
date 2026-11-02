import { useEffect, useRef, useState } from 'react'
import { SearchX } from 'lucide-react'
import { activarProducto, buscarProductos, desactivarProducto } from '../api/catalogo'
import type { BusquedaProductosResponse, ProductoResponse } from '../api/domain'
import { useAuth } from '../auth/useAuth'
import { Confirmacion } from '../components/Confirmacion'
import { EstadoVacio } from '../components/EstadoVacio'
import { MensajeError } from '../components/FormFields'
import { Paginador } from '../components/Paginador'
import { useDebounce } from '../hooks/useDebounce'
import { usePaginaUrl } from '../hooks/usePaginaUrl'
import { formatearPesos } from '../lib/formato'
import { TAMANO_PAGINA, paginaValida } from '../lib/paginacion'
import { ProductoFormulario } from './ProductoFormulario'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/checkbox'
import { cn } from '@/lib/utils'

type Edicion = { modo: 'nuevo' } | { modo: 'editar'; producto: ProductoResponse } | null

export function Productos() {
  const { hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')

  const { params, pagina, actualizar, irAPagina } = usePaginaUrl('pagina')
  const qUrl = params.get('q') ?? ''
  const soloActivos = params.get('soloActivos') === 'true'
  const bajoStock = params.get('bajoStock') === 'true'
  const [texto, setTexto] = useState(qUrl)
  const q = useDebounce(texto.trim(), 300)

  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; r?: BusquedaProductosResponse; error?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<Edicion>(null)
  const [porDesactivar, setPorDesactivar] = useState<ProductoResponse | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const clave = JSON.stringify([q, soloActivos, bajoStock, pagina, version])
  const ultimoQ = useRef(qUrl)

  useEffect(() => {
    setTexto(qUrl)
  }, [qUrl])

  useEffect(() => {
    if (q === ultimoQ.current) return
    ultimoQ.current = q
    actualizar({ q: q || null, pagina: null }, true)
  }, [q, actualizar])

  useEffect(() => {
    let vigente = true
    buscarProductos({ q, soloActivos, bajoStock, pagina, tamano: TAMANO_PAGINA })
      .then(r => vigente && setRespuesta({ clave, r }))
      .catch(e => vigente && setRespuesta({ clave, error: e instanceof Error ? e.message : 'No se pudo buscar' }))
    return () => {
      vigente = false
    }
  }, [clave, q, soloActivos, bajoStock, pagina])

  const actual = respuesta?.clave === clave ? respuesta : null
  const cargando = !actual
  const resultado = actual?.r ?? null

  useEffect(() => {
    if (!resultado || resultado.totalPaginas === 0) return
    const valida = paginaValida(pagina, resultado.totalPaginas)
    if (valida !== pagina) irAPagina(valida, true)
  }, [resultado, pagina, irAPagina])

  const limpiar = () => {
    setTexto('')
    actualizar({ q: null, soloActivos: null, bajoStock: null, pagina: null }, true)
  }

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
          <Checkbox checked={soloActivos} onCheckedChange={(v: boolean | 'indeterminate') => actualizar({ soloActivos: !!v, pagina: null })} />
          Solo activos
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={bajoStock} onCheckedChange={(v: boolean | 'indeterminate') => actualizar({ bajoStock: !!v, pagina: null })} />
          Solo stock bajo
        </label>
      </div>

      <MensajeError mensaje={error ?? actual?.error ?? null} />

      {cargando && <div className="skeleton h-40 w-full" aria-hidden="true" />}
      {resultado && !cargando && resultado.total === 0 && (
        <EstadoVacio
          icono={SearchX}
          titulo="No se encontraron productos"
          descripcion={
            q
              ? `No hay coincidencias para «${q}». Prueba con otro código o nombre, o quita los filtros.`
              : 'Prueba a quitar «Solo activos» o «Solo stock bajo», o busca por otro código o nombre.'
          }
          acciones={
            <Button type="button" variant="secondary" size="sm" onClick={limpiar}>
              Limpiar búsqueda y filtros
            </Button>
          }
        />
      )}

      {productos.length > 0 && (
        <>
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
                {productos.map(p => (
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
          <Paginador
            pagina={resultado!.pagina}
            totalPaginas={resultado!.totalPaginas}
            total={resultado!.total}
            etiqueta={resultado!.total === 1 ? 'producto' : 'productos'}
            onCambiar={irAPagina}
          />
        </>
      )}

    </section>
  )
}