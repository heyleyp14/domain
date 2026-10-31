package co.edu.unipamplona.ferreteria.application.port.out;

import java.time.LocalDate;

/** Filtros opcionales de consulta de compras: proveedor, rango de fechas inclusivo y código de producto. */
public record FiltroCompras(Long proveedorId, LocalDate desde, LocalDate hasta, String codigoProducto) { }
