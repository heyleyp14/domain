package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.ComparacionPreciosUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.exception.ProductoNoEncontradoException;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios;
import co.edu.unipamplona.ferreteria.domain.model.PrecioCompra;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.service.ComparadorPrecios;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ComparacionPreciosService implements ComparacionPreciosUseCase {

    private final CompraRepositoryPort compras;
    private final ProveedorRepositoryPort proveedores;
    private final ProductoRepositoryPort productos;
    private final PoliticaAcceso acceso;
    private final ComparadorPrecios comparador = new ComparadorPrecios();

    public ComparacionPreciosService(CompraRepositoryPort compras, ProveedorRepositoryPort proveedores,
                                     ProductoRepositoryPort productos, PoliticaAcceso acceso) {
        this.compras = compras;
        this.proveedores = proveedores;
        this.productos = productos;
        this.acceso = acceso;
    }

    @Override
    public ComparacionPrecios comparar(Actor actor, String codigoProducto) {
        acceso.asegurarAdmin(actor, "comparar precios de compra");
        Validacion.exigir("código del producto", codigoProducto);
        String codigo = Producto.normalizarCodigo(codigoProducto);
        Producto producto = productos.buscarPorCodigo(codigo).orElseThrow(() -> new ProductoNoEncontradoException(codigo));
        List<PrecioCompra> precios = compras.buscarPreciosPorProducto(codigo);
        Set<Long> ids = new HashSet<>();
        precios.forEach(p -> ids.add(p.proveedorId()));
        Map<Long, String> nombres = new HashMap<>();
        proveedores.buscarPorIds(ids).forEach(p -> nombres.put(p.getId(), p.getNombre()));
        return comparador.comparar(producto.getCodigo(), producto.getNombre(), precios, nombres);
    }
}
