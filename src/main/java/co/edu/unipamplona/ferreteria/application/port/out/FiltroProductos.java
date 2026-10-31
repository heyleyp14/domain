package co.edu.unipamplona.ferreteria.application.port.out;

import java.util.Set;

/**
 * Filtros combinables de búsqueda de productos. El texto busca en código, nombre y nombre del proveedor;
 * {@code proveedoresCoincidentes} son los ids de proveedores cuyo nombre coincide con ese texto.
 */
public record FiltroProductos(String texto, boolean soloActivos, boolean bajoStock, Set<Long> proveedoresCoincidentes) { }
