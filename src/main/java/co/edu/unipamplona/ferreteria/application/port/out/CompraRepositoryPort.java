package co.edu.unipamplona.ferreteria.application.port.out;

import co.edu.unipamplona.ferreteria.domain.model.Compra;
import co.edu.unipamplona.ferreteria.domain.model.PrecioCompra;
import java.util.List;
import java.util.Optional;

/** Puerto de salida de compras a proveedores. */
public interface CompraRepositoryPort {

    Compra guardar(Compra compra);

    Optional<Compra> buscarPorId(long id);

    List<Compra> buscar(FiltroCompras filtro);

    /** Igual que {@link #buscar(FiltroCompras)}, pero devuelve solo una página y el total. */
    Pagina<Compra> buscar(FiltroCompras filtro, Paginacion paginacion);

    /** Precios de compra registrados de un producto, de todos los proveedores. */
    List<PrecioCompra> buscarPreciosPorProducto(String codigo);
}
