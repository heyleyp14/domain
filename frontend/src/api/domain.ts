// Tipos para la API del Domain Service
// Basados en domain/src/main/java/co/edu/unipamplona/ferreteria/infrastructure/adapters/in/rest/dto/*

// Tipos compartidos
/** Money as sent by the server: a JSON number with 2 decimals (Colombian pesos). Display only, never recalculate. */
export type Dinero = number

export interface Auditoria {
  creadoPor: string
  creadoEn: string // ISO 8601
  modificadoPor: string | null
  modificadoEn: string | null
}

// Proveedores
export interface ProveedorRequest {
  nombre: string
  telefono: string | null
  correo: string | null
  direccion: string | null
}

export interface ProveedorResponse {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  direccion: string | null
  auditoria: Auditoria
}

export interface ProveedorDetalleResponse {
  proveedor: ProveedorResponse
  totalProductos: number
  productos: ProductoResumenResponse[]
}

// Productos
export interface ProductoNuevoRequest {
  codigo: string
  nombre: string
  precioBase: number
  aplicaIva: boolean
  stockInicial: number
  proveedorId: number
}

export interface ProductoEdicionRequest {
  nombre: string
  precioBase: number
  aplicaIva: boolean
  proveedorId: number
}

export interface ProductoResumenResponse {
  codigo: string
  nombre: string
  precioBase: Dinero
  aplicaIva: boolean
  precioFinal: Dinero
  stock: number
  stockBajo: boolean
  activo: boolean
}

export interface ProductoResponse extends ProductoResumenResponse {
  id: number
  proveedorId: number
  proveedorNombre: string
  auditoria: Auditoria
}

export interface BusquedaProductosResponse {
  total: number
  mensaje: string | null
  productos: ProductoResponse[]
}

// Facturas / Ventas
export interface ItemVentaRequest {
  codigo: string
  cantidad: number
}

export interface FacturaRequest {
  clienteNombre: string
  clienteDireccion: string | null
  clienteTelefono: string | null
  items: ItemVentaRequest[]
}

export interface LineaFacturaResponse {
  codigo: string
  nombre: string
  cantidad: number
  precioBase: Dinero
  aplicaIva: boolean
  subtotal: Dinero
  iva: Dinero
  total: Dinero
}

export interface FacturaResponse {
  numero: string
  fecha: string // ISO 8601
  estado: 'EMITIDA' | 'ANULADA'
  clienteNombre: string
  clienteDireccion: string | null
  clienteTelefono: string | null
  vendedor: string
  lineas: LineaFacturaResponse[]
  subtotal: Dinero
  iva: Dinero
  total: Dinero
  anuladaPor: string | null
  anuladaEn: string | null // ISO 8601
  motivoAnulacion: string | null
}

export interface AnulacionRequest {
  motivo: string
}

// Compras
export interface ItemCompraRequest {
  codigo: string
  cantidad: number
  precioCompra: number
}

export interface CompraRequest {
  proveedorId: number
  fecha: string // YYYY-MM-DD
  items: ItemCompraRequest[]
}

export interface LineaCompraResponse {
  codigo: string
  nombre: string
  cantidad: number
  precioUnitario: Dinero
  total: Dinero
}

export interface CompraResponse {
  codigo: string
  proveedorId: number
  proveedorNombre: string
  fecha: string // YYYY-MM-DD
  registradaPor: string
  registradaEn: string // ISO 8601
  lineas: LineaCompraResponse[]
  total: Dinero
}

// Comparación de precios
export interface OfertaResponse {
  proveedorId: number
  proveedorNombre: string
  ultimoPrecio: Dinero
  fechaUltimaCompra: string // YYYY-MM-DD
  menorPrecioHistorico: Dinero
  compras: number
  esMenor: boolean
}

export interface ComparacionResponse {
  codigoProducto: string
  nombreProducto: string
  mensaje: string | null
  ofertas: OfertaResponse[]
}

// Reporte diario
export interface LineaReporteResponse {
  codigo: string
  nombre: string
  cantidad: number
  subtotal: Dinero
  iva: Dinero
  total: Dinero
}

export interface ResumenFacturaResponse {
  numero: string
  fecha: string // ISO 8601
  cliente: string
  vendedor: string
  total: Dinero
  anulada: boolean
}

export interface ReporteDiarioResponse {
  fecha: string // YYYY-MM-DD
  mensaje: string | null
  facturasEmitidas: number
  facturasAnuladas: number
  unidadesVendidas: number
  subtotal: Dinero
  iva: Dinero
  total: Dinero
  productos: LineaReporteResponse[]
  facturas: ResumenFacturaResponse[]
}