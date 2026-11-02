package co.edu.unipamplona.ferreteria.application.port.out;

import co.edu.unipamplona.ferreteria.domain.model.Producto;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Puerto de salida del catálogo de productos. */
public interface ProductoRepositoryPort {

    Producto guardar(Producto producto);

    Optional<Producto> buscarPorCodigo(String codigo);

    /** Bloquea (SELECT … FOR UPDATE) los productos indicados y los devuelve ordenados por código. */
    List<Producto> buscarPorCodigosBloqueando(Collection<String> codigos);

    List<Producto> buscar(FiltroProductos filtro);

    /** Igual que {@link #buscar(FiltroProductos)}, pero devuelve solo una página y el total. */
    Pagina<Producto> buscar(FiltroProductos filtro, Paginacion paginacion);

    List<Producto> buscarPorProveedor(long proveedorId);

    /** Productos de un proveedor, paginados. */
    Pagina<Producto> buscarPorProveedor(long proveedorId, Paginacion paginacion);
}
