package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import java.util.List;

/** Un proveedor con los productos que suministra (los que lo tienen asignado). */
public record ProveedorDetalle(Proveedor proveedor, List<Producto> productos) { }
