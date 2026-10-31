package co.edu.unipamplona.ferreteria.contract;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.FiltroCompras;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

public abstract class CompraRepositoryContractTest {

    protected abstract CompraRepositoryPort repo();

    private LineaCompra l(String codigo, int cantidad, String precio) {
        return new LineaCompra(codigo, "Producto " + codigo, cantidad, Dinero.de(precio));
    }

    private Compra compra(long proveedor, String fecha, LineaCompra... lineas) {
        return Compra.registrar(proveedor, LocalDate.parse(fecha), Datos.HOY, "admin", Datos.AHORA, List.of(lineas));
    }

    @Test
    void guardaYRecuperaConSusLineas() {
        Compra g = repo().guardar(compra(3, "2026-09-01", l("MAR-01", 6, "18000.50"), l("CLA-01", 500, "60")));
        assertNotNull(g.getId());
        Compra r = repo().buscarPorId(g.getId()).orElseThrow();
        assertEquals(3L, r.getProveedorId());
        assertEquals(LocalDate.parse("2026-09-01"), r.getFecha());
        assertEquals("admin", r.getRegistradaPor());
        assertEquals(Datos.AHORA, r.getRegistradaEn());
        assertEquals(2, r.getLineas().size());
        assertEquals("MAR-01", r.getLineas().get(0).codigoProducto());
        assertEquals("Producto MAR-01", r.getLineas().get(0).nombreProducto());
        assertEquals(6, r.getLineas().get(0).cantidad());
        assertEquals(Dinero.de("18000.50"), r.getLineas().get(0).precioUnitario());
        assertEquals(g.total(), r.total());
        assertEquals(Dinero.de("138003.00"), r.total());
        assertTrue(repo().buscarPorId(12345).isEmpty());
    }

    @Test
    void buscaConFiltrosYOrdenaDeLaMasRecienteALaMasAntigua() {
        repo().guardar(compra(1, "2026-09-01", l("MAR-01", 1, "100")));
        repo().guardar(compra(2, "2026-09-15", l("MAR-01", 1, "110"), l("CLA-01", 10, "5")));
        repo().guardar(compra(1, "2026-10-01", l("CLA-01", 1, "6")));
        assertEquals(List.of(3L, 2L, 1L), ids(new FiltroCompras(null, null, null, null)));
        assertEquals(List.of(3L, 1L), ids(new FiltroCompras(1L, null, null, null)));
        assertEquals(List.of(2L), ids(new FiltroCompras(null, LocalDate.parse("2026-09-10"), LocalDate.parse("2026-09-30"), null)));
        assertEquals(List.of(2L), ids(new FiltroCompras(null, LocalDate.parse("2026-09-15"), LocalDate.parse("2026-09-15"), null)));
        assertEquals(List.of(3L, 2L), ids(new FiltroCompras(null, LocalDate.parse("2026-09-15"), null, null)));
        assertEquals(List.of(2L, 1L), ids(new FiltroCompras(null, null, null, "MAR-01")));
        assertEquals(List.of(2L), ids(new FiltroCompras(2L, null, null, "CLA-01")));
        assertTrue(ids(new FiltroCompras(9L, null, null, null)).isEmpty());
    }

    @Test
    void entregaLosPreciosDeUnProductoDeTodosLosProveedores() {
        repo().guardar(compra(1, "2026-09-01", l("MAR-01", 1, "100")));
        repo().guardar(compra(2, "2026-09-15", l("MAR-01", 3, "110"), l("CLA-01", 10, "5")));
        repo().guardar(compra(1, "2026-10-01", l("MAR-01", 1, "120")));
        List<PrecioCompra> precios = repo().buscarPreciosPorProducto("MAR-01");
        assertEquals(3, precios.size());
        assertEquals(List.of(1L, 2L, 1L), precios.stream().sorted(java.util.Comparator.comparing(PrecioCompra::fecha)).map(PrecioCompra::proveedorId).toList());
        assertEquals(List.of(Dinero.de("100"), Dinero.de("110"), Dinero.de("120")),
                precios.stream().sorted(java.util.Comparator.comparing(PrecioCompra::fecha)).map(PrecioCompra::precioUnitario).toList());
        assertEquals(1, repo().buscarPreciosPorProducto("CLA-01").size());
        assertTrue(repo().buscarPreciosPorProducto("NO-1").isEmpty());
    }

    private List<Long> ids(FiltroCompras f) { return repo().buscar(f).stream().map(Compra::getId).toList(); }
}
