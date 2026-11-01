import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { crearProveedor, editarProveedor, listarProveedores, obtenerProveedor } from '../api/catalogo'
import type { ProveedorDetalleResponse, ProveedorResponse } from '../api/domain'
import { useAuth } from '../auth/useAuth'
import { CampoTexto } from '../components/Campo'
import { MensajeError } from '../components/FormFields'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { useDebounce } from '../hooks/useDebounce'
import { formatearPesos } from '../lib/formato'
import {
  ETIQUETAS_PROVEEDOR, erroresDesdeServidor, hayErrores, validarProveedor,
  type CampoProveedor, type ErroresCampo, type FormProveedor,
} from '../lib/validacion'

const vacio = (texto: string) => (texto.trim() ? texto.trim() : null)

function ProveedorFormulario({ proveedor, onGuardado, onCancelar }: {
  proveedor?: ProveedorResponse
  onGuardado: (p: ProveedorResponse) => void
  onCancelar: () => void
}) {
  const editando = proveedor !== undefined
  const [form, setForm] = useState<FormProveedor>({
    nombre: proveedor?.nombre ?? '',
    telefono: proveedor?.telefono ?? '',
    correo: proveedor?.correo ?? '',
    direccion: proveedor?.direccion ?? '',
  })
  const [errores, setErrores] = useState<ErroresCampo<CampoProveedor>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo: CampoProveedor, valor: string) => {
    setForm(f => ({ ...f, [campo]: valor }))
    setErrores(e => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const locales = validarProveedor(form)
    setErrores(locales)
    if (hayErrores(locales)) return

    setGuardando(true)
    try {
      const datos = { nombre: form.nombre.trim(), telefono: vacio(form.telefono), correo: vacio(form.correo), direccion: vacio(form.direccion) }
      onGuardado(editando ? await editarProveedor(proveedor.id, datos) : await crearProveedor(datos))
    } catch (err) {
      if (err instanceof ApiError && [400, 409].includes(err.status)) {
        const porCampo = erroresDesdeServidor(err.message, ETIQUETAS_PROVEEDOR)
        setErrores(porCampo)
        if (!hayErrores(porCampo)) setErrorGeneral(err.message)
      } else {
        setErrorGeneral(err instanceof Error ? err.message : 'No se pudo guardar el proveedor')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" onSubmit={enviar} noValidate
      aria-label={editando ? 'Editar proveedor' : 'Nuevo proveedor'}>
      <h2 className="text-base font-semibold">{editando ? `Editar ${proveedor.nombre}` : 'Nuevo proveedor'}</h2>
      <MensajeError mensaje={errorGeneral} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto id="proveedor-nombre" label="Nombre" value={form.nombre}
          onChange={e => cambiar('nombre', e.target.value)} error={errores.nombre} maxLength={100} autoFocus />
        <CampoTexto id="proveedor-telefono" label="Teléfono" type="tel" value={form.telefono}
          onChange={e => cambiar('telefono', e.target.value)} error={errores.telefono}
          ayuda="Teléfono o correo: al menos uno de los dos" />
        <CampoTexto id="proveedor-correo" label="Correo" type="email" value={form.correo}
          onChange={e => cambiar('correo', e.target.value)} error={errores.correo} />
        <CampoTexto id="proveedor-direccion" label="Dirección" value={form.direccion}
          onChange={e => cambiar('direccion', e.target.value)} error={errores.direccion} maxLength={150} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
      </div>
    </form>
  )
}

function DetalleProveedor({ detalle, onCerrar }: { detalle: ProveedorDetalleResponse; onCerrar: () => void }) {
  const p = detalle.proveedor
  return (
    <Card role="region" aria-label={`Detalle de ${p.nombre}`} className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-semibold">{p.nombre}</h2>
          <p className="text-sm text-muted-foreground">
            Teléfono: {p.telefono ?? 'Sin dato'} · Correo: {p.correo ?? 'Sin dato'} · Dirección: {p.direccion ?? 'Sin dato'}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onCerrar}>Cerrar</Button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Productos que suministra ({detalle.totalProductos})</h3>
        {detalle.productos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este proveedor todavía no tiene productos.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Productos que suministra {p.nombre}</caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-left font-medium">Nombre</th>
                  <th className="px-3 py-2 text-right font-medium">Precio final</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detalle.productos.map(pr => (
                  <tr key={pr.codigo}>
                    <td className="px-3 py-2">{pr.codigo}</td>
                    <td className="px-3 py-2">{pr.nombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(pr.precioFinal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {pr.stock} {pr.stockBajo && (
                        <span className="ml-1 inline-flex items-center rounded-full border border-[var(--pill-warning-line)] bg-[var(--pill-warning-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--pill-warning-ink)]">
                          Stock bajo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{pr.activo ? 'Activo' : 'Inactivo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}

type Edicion = { modo: 'nuevo' } | { modo: 'editar'; proveedor: ProveedorResponse } | null

/** Suppliers (HU-8): search and detail for everyone; create and edit for ADMIN. */
export function Proveedores() {
  const { hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto.trim(), 300)
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; lista?: ProveedorResponse[]; error?: string } | null>(null)
  const [detalle, setDetalle] = useState<ProveedorDetalleResponse | null>(null)
  const [edicion, setEdicion] = useState<Edicion>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const detalleRef = useRef<HTMLDivElement>(null)
  const clave = JSON.stringify([q, version])

  useEffect(() => {
    let vigente = true
    listarProveedores(q)
      .then(lista => vigente && setRespuesta({ clave, lista }))
      .catch(e => vigente && setRespuesta({ clave, error: e instanceof Error ? e.message : 'No se pudieron cargar los proveedores' }))
    return () => {
      vigente = false
    }
  }, [clave, q])

  const actual = respuesta?.clave === clave ? respuesta : null
  const lista = actual?.lista ?? null

  useEffect(() => {
    if (detalle) detalleRef.current?.scrollIntoView?.({ block: 'start' })
  }, [detalle])

  const verDetalle = async (id: number) => {
    setError(null)
    try {
      setDetalle(await obtenerProveedor(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el proveedor')
    }
  }

  const alGuardar = (p: ProveedorResponse) => {
    setEdicion(null)
    setAviso(`Proveedor «${p.nombre}» guardado`)
    setVersion(v => v + 1)
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Directorio de proveedores y los productos que suministran.</p>
        </div>
        {esAdmin && !edicion && (
          <Button type="button" onClick={() => { setAviso(null); setEdicion({ modo: 'nuevo' }) }}>
            Nuevo proveedor
          </Button>
        )}
      </header>

      {aviso && (
        <p role="status" className="rounded-md border border-border bg-[var(--pill-positive-bg)] px-3 py-2 text-sm text-[var(--pill-positive-ink)]">
          {aviso}
        </p>
      )}

      {edicion && (
        <ProveedorFormulario
          key={edicion.modo === 'editar' ? edicion.proveedor.id : 'nuevo'}
          proveedor={edicion.modo === 'editar' ? edicion.proveedor : undefined}
          onGuardado={alGuardar}
          onCancelar={() => setEdicion(null)}
        />
      )}

      <Card className="p-4">
        <div role="search">
          <CampoTexto id="buscar-proveedor" label="Buscar proveedor por nombre" type="search" value={texto}
            onChange={e => setTexto(e.target.value)} autoComplete="off" placeholder="Ej.: Distribuidora Andina" />
        </div>
      </Card>

      {detalle && (
        <div ref={detalleRef}>
          <DetalleProveedor detalle={detalle} onCerrar={() => setDetalle(null)} />
        </div>
      )}

      <MensajeError mensaje={error ?? actual?.error ?? null} />
      {!actual && <div className="skeleton h-40 w-full" aria-hidden="true" />}

      {lista && lista.length === 0 && <p className="text-sm text-muted-foreground">No se encontraron proveedores</p>}
      {lista && lista.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Proveedores</caption>
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium">Correo</th>
                <th className="px-3 py-2 text-left font-medium">Dirección</th>
                <th className="px-3 py-2 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map(p => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium">{p.nombre}</td>
                  <td className="px-3 py-2">{p.telefono ?? 'Sin dato'}</td>
                  <td className="px-3 py-2">{p.correo ?? 'Sin dato'}</td>
                  <td className="px-3 py-2">{p.direccion ?? 'Sin dato'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" variant="secondary" size="sm" onClick={() => void verDetalle(p.id)}>
                        Ver productos
                      </Button>
                      {esAdmin && (
                        <Button type="button" variant="secondary" size="sm"
                          onClick={() => { setAviso(null); setEdicion({ modo: 'editar', proveedor: p }) }}>
                          Editar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
