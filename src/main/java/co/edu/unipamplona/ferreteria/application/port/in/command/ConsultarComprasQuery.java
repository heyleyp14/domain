package co.edu.unipamplona.ferreteria.application.port.in.command;

/** Filtros opcionales: proveedor, rango de fechas (AAAA-MM-DD, inclusivo) y código de producto. */
public record ConsultarComprasQuery(Long proveedorId, String desde, String hasta, String codigoProducto) { }
