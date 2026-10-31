package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.domain.model.Compra;

/** Una compra con el nombre del proveedor, para mostrarla sin una segunda consulta. */
public record CompraDetalle(Compra compra, String proveedorNombre) { }
