import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { crearProveedor, editarProveedor, listarProveedores, obtenerProveedor } from '../api/catalogo'
import type { ProveedorDetalleResponse, ProveedorResponse } from '../api/domain'
import { useAuth } from '../auth/useAuth'
import { Input, MensajeError } from '../components/FormFields'
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
    <form className="card formulario" onSubmit={enviar} noValidate aria-label={editando ? 'Editar proveedor' : 'Nuevo proveedor'}>
      <h2>{editando ? `Editar ${proveedor.nombre}` : 'Nuevo proveedor'}</h2>
      <MensajeError mensaje={errorGeneral} />
      <Input label="Nombre" value={form.nombre} onChange={e => cambiar('nombre', e.target.value)} error={errores.nombre} maxLength={100} autoFocus />
      <Input label="Teléfono" type="tel" value={form.telefono} onChange={e => cambiar('telefono', e.target.value)} error={errores.telefono}
        ayuda="Teléfono o correo: al menos uno de los dos" />
      <Input label="Correo" type="email" value={form.correo} onChange={e => cambiar('correo', e.target.value)} error={errores.correo} />
      <Input label="Dirección" value={form.direccion} onChange={e => cambiar('direccion', e.target.value)} error={errores.direccion} maxLength={150} />
      <div className="acciones">
        <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  )
}

function DetalleProveedor({ detalle, onCerrar }: { detalle: ProveedorDetalleResponse; onCerrar: () => void }) {
  const p = detalle.proveedor
  return (
    <div className="card" aria-label={`Detalle de ${p.nombre}`} role="region">
      <h2>{p.nombre}</h2>
      <p>Teléfono: {p.telefono ?? '—'} · Correo: {p.correo ?? '—'} · Dirección: {p.direccion ?? '—'}</p>
      <h3>Productos que suministra ({detalle.totalProductos})</h3>
      {detalle.productos.length === 0 ? (
        <p className="sin-resultados">Este proveedor todavía no tiene productos.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Código</th><th>Nombre</th><th className="numero">Precio final</th><th className="numero">Stock</th><th>Estado</th></tr></thead>
            <tbody>
              {detalle.productos.map(pr => (
                <tr key={pr.codigo}>
                  <td>{pr.codigo}</td><td>{pr.nombre}</td><td className="numero">{formatearPesos(pr.precioFinal)}</td>
                  <td className="numero">{pr.stock} {pr.stockBajo && <span className="badge badge-warning">Stock bajo</span>}</td>
                  <td>{pr.activo ? 'Activo' : 'Inactivo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
    </div>
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
    <section className="pagina">
      <div className="pagina-encabezado">
        <h1>Proveedores</h1>
        {esAdmin && !edicion && (
          <button type="button" className="btn btn-primary btn-nuevo" onClick={() => { setAviso(null); setEdicion({ modo: 'nuevo' }) }}>
            Nuevo proveedor
          </button>
        )}
      </div>

      {aviso && <p className="aviso" role="status">{aviso}</p>}
      {edicion && (
        <ProveedorFormulario
          key={edicion.modo === 'editar' ? edicion.proveedor.id : 'nuevo'}
          proveedor={edicion.modo === 'editar' ? edicion.proveedor : undefined}
          onGuardado={alGuardar}
          onCancelar={() => setEdicion(null)}
        />
      )}
      {detalle && <DetalleProveedor detalle={detalle} onCerrar={() => setDetalle(null)} />}

      <div className="filtros" role="search">
        <label htmlFor="buscar-proveedor">Buscar proveedor por nombre</label>
        <input id="buscar-proveedor" type="search" value={texto} onChange={e => setTexto(e.target.value)} />
      </div>

      <MensajeError mensaje={error ?? actual?.error ?? null} />
      {!actual && <p className="loading">Cargando...</p>}

      {lista && lista.length === 0 && <p className="sin-resultados">No se encontraron proveedores</p>}
      {lista && lista.length > 0 && (
        <div className="table-container">
          <table>
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Dirección</th><th>Acciones</th></tr></thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre}</td><td>{p.telefono ?? '—'}</td><td>{p.correo ?? '—'}</td><td>{p.direccion ?? '—'}</td>
                  <td className="acciones">
                    <button type="button" className="btn btn-secondary" onClick={() => void verDetalle(p.id)}>Ver productos</button>
                    {esAdmin && (
                      <button type="button" className="btn btn-secondary" onClick={() => { setAviso(null); setEdicion({ modo: 'editar', proveedor: p }) }}>
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {esAdmin && !edicion && (
        <button type="button" className="btn btn-primary btn-nuevo-fin" onClick={() => { setAviso(null); setEdicion({ modo: "nuevo" }) }}>
          Nuevo proveedor
        </button>
      )}
    </section>
  )
}
