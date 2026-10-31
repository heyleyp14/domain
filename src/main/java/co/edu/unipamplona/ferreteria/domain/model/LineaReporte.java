package co.edu.unipamplona.ferreteria.domain.model;

/** Un producto en el reporte diario: unidades vendidas y valores del día, sin contar facturas anuladas. */
public record LineaReporte(String codigoProducto, String nombreProducto, int cantidad, Dinero subtotal, Dinero iva, Dinero total) { }
