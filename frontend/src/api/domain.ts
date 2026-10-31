// Tipos para la API del Domain Service
// Basados en domain/src/main/java/co/edu/unipamplona/ferreteria/infrastructure/adapters/in/rest/dto/*

// Tipos compartidos
export interface Auditoria {
  creadoPor: string
  creadoEn: string // ISO 8601
  modificadoPor: string
  modificadoEn: string // ISO 8601
}

// Proveedores
export interface ProveedorRequest {
  nombre: string
  telefono: string
  correo: string
  direccion: string
}

export interface ProveedorResponse {
  id: number
  nombre: string
  telefono: string
  correo: string
  direccion: string
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
  precioBase: string // BigDecimal como string
  aplicaIva: boolean
  stockInicial: number
  proveedorId: number
}

export interface ProductoEdicionRequest {
  nombre: string
  precioBase: string
  aplicaIva: boolean
  proveedorId: number
}

export interface ProductoResumenResponse {
  codigo: string
  nombre: string
  precioBase: string
  aplicaIva: boolean
  precioFinal: string
  stock: number
  stockBajo: boolean
  activo: boolean
}

export interface ProductoResponse {
  id: number
  codigo: string
  nombre: string
  precioBase: string
  aplicaIva: boolean
  precioFinal: string
  stock: number
  stockBajo: boolean
  activo: boolean
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
  clienteDireccion: string
  clienteTelefono: string
  items: ItemVentaRequest[]
}

export interface LineaFacturaResponse {
  codigo: string
  nombre: string
  cantidad: number
  precioBase: string
  aplicaIva: boolean
  subtotal: string
  iva: string
  total: string
}

export interface FacturaResponse {
  numero: string
  fecha: string // ISO 8601
  estado: string // 'EMITIDA' | 'ANULADA'
  clienteNombre: string
  clienteDireccion: string
  clienteTelefono: string
  vendedor: string
  lineas: LineaFacturaResponse[]
  subtotal: string
  iva: string
  total: string
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
  precioCompra: string // BigDecimal como string
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
  precioUnitario: string
  total: string
}

export interface CompraResponse {
  codigo: string
  proveedorId: number
  proveedorNombre: string
  fecha: string // YYYY-MM-DD
  registradaPor: string
  registradaEn: string // ISO 8601
  lineas: LineaCompraResponse[]
  total: string
}

// Comparación de precios
export interface OfertaResponse {
  proveedorId: number
  proveedorNombre: string
  ultimoPrecio: string
  fechaUltimaCompra: string // YYYY-MM-DD
  menorPrecioHistorico: string
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
  subtotal: string
  iva: string
  total: string
}

export interface ResumenFacturaResponse {
  numero: string
  fecha: string // ISO 8601
  cliente: string
  vendedor: string
  total: string
  anulada: boolean
}

export interface ReporteDiarioResponse {
  fecha: string // YYYY-MM-DD
  mensaje: string | null
  facturasEmitidas: number
  facturasAnuladas: number
  unidadesVendidas: number
  subtotal: string
  iva: string
  total: string
  productos: LineaReporteResponse[]
  facturas: ResumenFacturaResponse[]
}