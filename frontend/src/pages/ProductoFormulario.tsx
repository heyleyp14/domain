import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { crearProducto, editarProducto, listarProveedores } from '../api/catalogo'
import type { ProductoResponse, ProveedorResponse } from '../api/domain'
import { Input, MensajeError, Select } from '../components/FormFields'
import {
  ETIQUETAS_PRODUCTO, erroresDesdeServidor, hayErrores, validarProducto,
  type CampoProducto, type ErroresCampo, type FormProducto,
} from '../lib/validacion'

interface Props {
  /** Product to edit; undefined to create a new one. */
  producto?: ProductoResponse
  onGuardado: (producto: ProductoResponse) => void
  onCancelar: () => void
}

function inicial(p?: ProductoResponse): FormProducto {
  return {
    codigo: p?.codigo ?? '',
    nombre: p?.nombre ?? '',
    precioBase: p ? p.precioBase.toFixed(2) : '',
    aplicaIva: p?.aplicaIva ?? true,
    stockInicial: '0',
    proveedorId: p ? String(p.proveedorId) : '',
  }
}

/** Create or edit a product (ADMIN, HU-8). Editing never shows the stock as editable: it only changes through sales, purchases and cancellations. */
export function ProductoFormulario({ producto, onGuardado, onCancelar }: Props) {
  const editando = producto !== undefined
  const [form, setForm] = useState<FormProducto>(() => inicial(producto))
  const [errores, setErrores] = useState<ErroresCampo<CampoProducto>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    listarProveedores()
      .then(setProveedores)
      .catch(e => setErrorGeneral(e instanceof Error ? e.message : 'No se pudieron cargar los proveedores'))
  }, [])

  const cambiar = <K extends keyof FormProducto>(campo: K, valor: FormProducto[K]) => {
    setForm(f => ({ ...f, [campo]: valor }))
    setErrores(e => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const locales = validarProducto(form, editando)
    setErrores(locales)
    if (hayErrores(locales)) return

    setGuardando(true)
    try {
      const datos = {
        nombre: form.nombre.trim(),
        precioBase: Number(form.precioBase.trim().replace(',', '.')),
        aplicaIva: form.aplicaIva,
        proveedorId: Number(form.proveedorId),
      }
      const guardado = editando
        ? await editarProducto(producto.codigo, datos)
        : await crearProducto({ ...datos, codigo: form.codigo.trim().toUpperCase(), stockInicial: Number(form.stockInicial) })
      onGuardado(guardado)
    } catch (err) {
      if (err instanceof ApiError && [400, 404, 409].includes(err.status)) {
        const porCampo = erroresDesdeServidor(err.message, ETIQUETAS_PRODUCTO)
        setErrores(porCampo)
        if (!hayErrores(porCampo)) setErrorGeneral(err.message)
      } else {
        setErrorGeneral(err instanceof Error ? err.message : 'No se pudo guardar el producto')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="card formulario" onSubmit={enviar} noValidate aria-label={editando ? 'Editar producto' : 'Nuevo producto'}>
      <h2>{editando ? `Editar ${producto.codigo}` : 'Nuevo producto'}</h2>
      <MensajeError mensaje={errorGeneral} />

      {!editando && (
        <Input
          label="Código"
          value={form.codigo}
          onChange={e => cambiar('codigo', e.target.value.toUpperCase())}
          error={errores.codigo}
          ayuda="De 2 a 20 caracteres: letras, números o guion"
          maxLength={20}
          autoFocus
        />
      )}
      <Input label="Nombre" value={form.nombre} onChange={e => cambiar('nombre', e.target.value)} error={errores.nombre} maxLength={100} />
      <Input
        label="Precio base (sin IVA)"
        inputMode="decimal"
        value={form.precioBase}
        onChange={e => cambiar('precioBase', e.target.value)}
        error={errores.precioBase}
        ayuda="Ejemplo: 25000.50"
      />
      <div className="form-group">
        <label>
          <input type="checkbox" checked={form.aplicaIva} onChange={e => cambiar('aplicaIva', e.target.checked)} /> Aplica IVA (19 %)
        </label>
      </div>
      {editando ? (
        <p className="ayuda-campo">
          Stock actual: <strong>{producto.stock}</strong>. Editar no cambia el inventario: el stock solo cambia con ventas, compras y anulaciones.
        </p>
      ) : (
        <Input
          label="Stock inicial"
          inputMode="numeric"
          value={form.stockInicial}
          onChange={e => cambiar('stockInicial', e.target.value)}
          error={errores.stockInicial}
        />
      )}
      <Select
        label="Proveedor"
        value={form.proveedorId}
        onChange={e => cambiar('proveedorId', e.target.value)}
        error={errores.proveedorId}
        opciones={proveedores.map(p => ({ value: String(p.id), label: p.nombre }))}
      />

      <div className="acciones">
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
