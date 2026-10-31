package co.edu.unipamplona.ferreteria.domain.model;

import java.time.LocalDate;

/** Un precio de compra registrado de un producto: de qué compra, de qué proveedor, cuándo y a cuánto. */
public record PrecioCompra(long compraId, long proveedorId, LocalDate fecha, Dinero precioUnitario) { }
