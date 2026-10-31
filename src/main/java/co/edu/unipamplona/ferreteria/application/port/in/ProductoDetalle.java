package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;

/** Un producto junto con el proveedor al que se le compra. */
public record ProductoDetalle(Producto producto, Proveedor proveedor) { }
