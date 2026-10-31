// Client-side checks that mirror the domain rules (Producto.java, Proveedor.java, Contacto.java), so the
// user sees every problem at once. They do NOT replace the server: it validates again and has the final word.

export type ErroresCampo<C extends string> = Partial<Record<C, string>>

export type CampoProducto = 'codigo' | 'nombre' | 'precioBase' | 'stockInicial' | 'proveedorId'
export type CampoProveedor = 'nombre' | 'telefono' | 'correo' | 'direccion'

export interface FormProducto {
  codigo: string
  nombre: string
  precioBase: string
  aplicaIva: boolean
  stockInicial: string
  proveedorId: string
}

export interface FormProveedor {
  nombre: string
  telefono: string
  correo: string
  direccion: string
}

const CODIGO = /^[A-Z0-9-]{2,20}$/
const PRECIO = /^\d{1,9}(\.\d{1,2})?$/
const TELEFONO = /^[0-9+()\-\s]{7,20}$/
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Checks a product form. `editando` skips the code and the initial stock, which cannot change. */
export function validarProducto(f: FormProducto, editando: boolean): ErroresCampo<CampoProducto> {
  const e: ErroresCampo<CampoProducto> = {}
  if (!editando) {
    const codigo = f.codigo.trim().toUpperCase()
    if (!codigo) e.codigo = 'El código es obligatorio'
    else if (!CODIGO.test(codigo)) e.codigo = 'El código debe tener de 2 a 20 caracteres (letras, números o guion)'

    const stock = f.stockInicial.trim()
    if (!stock) e.stockInicial = 'El stock inicial es obligatorio'
    else if (!/^\d+$/.test(stock)) e.stockInicial = 'El stock debe ser un número entero, sin negativos'
    else if (Number(stock) > 1_000_000) e.stockInicial = 'El stock no puede superar 1000000 unidades'
  }

  const nombre = f.nombre.trim()
  if (!nombre) e.nombre = 'El nombre es obligatorio'
  else if (nombre.length < 2 || nombre.length > 100) e.nombre = 'El nombre debe tener entre 2 y 100 caracteres'

  const precio = f.precioBase.trim().replace(',', '.')
  if (!precio) e.precioBase = 'El precio es obligatorio'
  else if (!PRECIO.test(precio)) e.precioBase = 'Escriba el precio con máximo 2 decimales, sin puntos de miles'
  else if (Number(precio) <= 0) e.precioBase = 'El precio debe ser mayor que cero'

  if (!f.proveedorId) e.proveedorId = 'Seleccione el proveedor'
  return e
}

export function validarProveedor(f: FormProveedor): ErroresCampo<CampoProveedor> {
  const e: ErroresCampo<CampoProveedor> = {}
  const nombre = f.nombre.trim()
  if (!nombre) e.nombre = 'El nombre es obligatorio'
  else if (nombre.length < 2 || nombre.length > 100) e.nombre = 'El nombre debe tener entre 2 y 100 caracteres'

  const telefono = f.telefono.trim()
  const correo = f.correo.trim()
  if (!telefono && !correo) {
    e.telefono = 'Indique teléfono o correo'
    e.correo = 'Indique teléfono o correo'
  }
  if (telefono && !TELEFONO.test(telefono)) e.telefono = 'Use de 7 a 20 caracteres (dígitos, +, paréntesis, guion o espacio)'
  if (correo && !CORREO.test(correo)) e.correo = 'Correo electrónico inválido'
  if (f.direccion.trim().length > 150) e.direccion = 'La dirección no puede superar 150 caracteres'
  return e
}

/**
 * The server does not return per-field errors: a 400 carries one message, either
 * "Faltan campos obligatorios: código, nombre, ..." or the first rule broken. This maps that message back
 * to the fields it names, so each one is marked on the form.
 */
export function erroresDesdeServidor<C extends string>(
  mensaje: string,
  etiquetas: Record<string, C>,
): ErroresCampo<C> {
  const e: ErroresCampo<C> = {}
  const faltantes = /^Faltan campos obligatorios:\s*(.+)$/i.exec(mensaje)
  if (faltantes) {
    for (const etiqueta of faltantes[1].split(',').map(s => s.trim().toLowerCase())) {
      const campo = etiquetas[etiqueta]
      if (campo) e[campo] = 'Este campo es obligatorio'
    }
    return e
  }
  const texto = mensaje.toLowerCase()
  for (const [etiqueta, campo] of Object.entries(etiquetas)) {
    if (texto.includes(etiqueta) && !e[campo]) {
      e[campo] = mensaje
      break
    }
  }
  return e
}

/** Labels the domain uses in its messages, mapped to the form fields. */
export const ETIQUETAS_PRODUCTO: Record<string, CampoProducto> = {
  'código': 'codigo',
  nombre: 'nombre',
  precio: 'precioBase',
  'stock inicial': 'stockInicial',
  stock: 'stockInicial',
  proveedor: 'proveedorId',
}

export const ETIQUETAS_PROVEEDOR: Record<string, CampoProveedor> = {
  nombre: 'nombre',
  'teléfono': 'telefono',
  correo: 'correo',
  'dirección': 'direccion',
}

export type CampoCliente = 'clienteNombre' | 'clienteDireccion' | 'clienteTelefono'

export interface FormCliente {
  clienteNombre: string
  clienteDireccion: string
  clienteTelefono: string
}

/** Customer data of an invoice (Factura.java): name 2-100, optional address up to 150 and optional phone. */
export function validarCliente(f: FormCliente): ErroresCampo<CampoCliente> {
  const e: ErroresCampo<CampoCliente> = {}
  const nombre = f.clienteNombre.trim()
  if (!nombre) e.clienteNombre = 'El nombre del cliente es obligatorio'
  else if (nombre.length < 2 || nombre.length > 100) e.clienteNombre = 'El nombre debe tener entre 2 y 100 caracteres'
  if (f.clienteDireccion.trim().length > 150) e.clienteDireccion = 'La dirección no puede superar 150 caracteres'
  const telefono = f.clienteTelefono.trim()
  if (telefono && !TELEFONO.test(telefono)) e.clienteTelefono = 'Use de 7 a 20 caracteres (dígitos, +, paréntesis, guion o espacio)'
  return e
}

export const ETIQUETAS_VENTA: Record<string, CampoCliente> = {
  'nombre del cliente': 'clienteNombre',
  'dirección del cliente': 'clienteDireccion',
  'teléfono': 'clienteTelefono',
}

export interface LineaCompraForm {
  codigo: string
  cantidad: string
  precioCompra: string
}

export interface ErroresLineaCompra {
  cantidad?: string
  precioCompra?: string
}

/** A purchase line (Compra.java): quantity 1-100000, price greater than zero with up to 2 decimals. */
export function validarLineaCompra(l: LineaCompraForm): ErroresLineaCompra {
  const e: ErroresLineaCompra = {}
  const cantidad = l.cantidad.trim()
  if (!/^\d+$/.test(cantidad) || Number(cantidad) < 1 || Number(cantidad) > 100_000) e.cantidad = 'Entre 1 y 100000 unidades'
  const precio = l.precioCompra.trim().replace(',', '.')
  if (!precio) e.precioCompra = 'Escriba el precio'
  else if (!PRECIO.test(precio) || Number(precio) <= 0) e.precioCompra = 'Mayor que cero, con máximo 2 decimales'
  return e
}

export type CampoCompra = 'proveedorId' | 'fecha'

export const ETIQUETAS_COMPRA: Record<string, CampoCompra> = {
  proveedor: 'proveedorId',
  fecha: 'fecha',
}

export function hayErrores(e: object): boolean {
  return Object.values(e).some(Boolean)
}
