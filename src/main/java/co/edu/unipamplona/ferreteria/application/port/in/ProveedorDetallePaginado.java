package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;

/** Un proveedor con una página de los productos que suministra. */
public record ProveedorDetallePaginado(Proveedor proveedor, Pagina<Producto> productos) { }
