package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.in.command.*;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import java.util.List;

/** Productos y proveedores. Crear y modificar es del ADMIN; consultar y buscar es de cualquier usuario con rol conocido. */
public interface CatalogoUseCase {

    Proveedor registrarProveedor(Actor actor, RegistrarProveedorCommand comando);

    Proveedor editarProveedor(Actor actor, EditarProveedorCommand comando);

    ProveedorDetalle detalleProveedor(Actor actor, long id);

    List<Proveedor> listarProveedores(Actor actor, String texto);

    ProductoDetalle registrarProducto(Actor actor, RegistrarProductoCommand comando);

    ProductoDetalle editarProducto(Actor actor, EditarProductoCommand comando);

    ProductoDetalle desactivarProducto(Actor actor, String codigo);

    ProductoDetalle activarProducto(Actor actor, String codigo);

    ProductoDetalle detalleProducto(Actor actor, String codigo);

    List<ProductoDetalle> buscarProductos(Actor actor, BuscarProductosQuery consulta);
}
