package co.edu.unipamplona.ferreteria.contract;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.out.FiltroProductos;
import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

public abstract class ProductoRepositoryContractTest {

    protected abstract ProductoRepositoryPort repo();

    private List<String> codigos(List<Producto> l) { return l.stream().map(Producto::getCodigo).toList(); }

    @Test
    void guardaYRecuperaTodo() {
        Producto g = repo().guardar(Producto.registrar("mar-01", "Martillo de uña", new BigDecimal("25000.50"), true, 12, 7L, "admin", Datos.AHORA));
        assertNotNull(g.getId());
        Producto r = repo().buscarPorCodigo("MAR-01").orElseThrow();
        assertEquals("Martillo de uña", r.getNombre());
        assertEquals(Dinero.de("25000.50"), r.getPrecioBase());
        assertTrue(r.isAplicaIva());
        assertEquals(12, r.getStock());
        assertEquals(7L, r.getProveedorId());
        assertTrue(r.isActivo());
        assertEquals("admin", r.getAuditoria().creadoPor());
        assertEquals(Datos.AHORA, r.getAuditoria().creadoEn());
        assertTrue(repo().buscarPorCodigo("NO-EXISTE").isEmpty());
    }

    @Test
    void actualizaYConservaLaAuditoria() {
        repo().guardar(Datos.producto("MAR-01", "25000", true, 10, 1));
        Producto c = repo().buscarPorCodigo("MAR-01").orElseThrow();
        c.editar("Martillo nuevo", new BigDecimal("27000"), false, 2L, "admin2", Datos.AHORA.plusSeconds(600));
        c.descontar(4, "vendedor", Datos.AHORA.plusSeconds(900));
        c.desactivar("admin3", Datos.AHORA.plusSeconds(1200));
        repo().guardar(c);
        Producto r = repo().buscarPorCodigo("MAR-01").orElseThrow();
        assertEquals("Martillo nuevo", r.getNombre());
        assertEquals(Dinero.de("27000"), r.getPrecioBase());
        assertFalse(r.isAplicaIva());
        assertEquals(2L, r.getProveedorId());
        assertEquals(6, r.getStock());
        assertFalse(r.isActivo());
        assertEquals("admin", r.getAuditoria().creadoPor());
        assertEquals("admin3", r.getAuditoria().modificadoPor());
        assertEquals(Datos.AHORA.plusSeconds(1200), r.getAuditoria().modificadoEn());
    }

    @Test
    void bloqueaSoloLosQueExistenOrdenadosPorCodigo() {
        repo().guardar(Datos.producto("C-03", "1", true, 1, 1));
        repo().guardar(Datos.producto("A-01", "1", true, 1, 1));
        repo().guardar(Datos.producto("B-02", "1", true, 1, 1));
        assertEquals(List.of("A-01", "C-03"), codigos(repo().buscarPorCodigosBloqueando(List.of("C-03", "NO-1", "A-01"))));
        assertTrue(repo().buscarPorCodigosBloqueando(List.of()).isEmpty());
    }

    @Test
    void listaPorNombreYFiltraPorTextoCodigoOProveedor() {
        repo().guardar(Producto.registrar("MAR-01", "Martillo", new BigDecimal("1"), true, 10, 1L, "a", Datos.AHORA));
        repo().guardar(Producto.registrar("PIN-01", "Pintura", new BigDecimal("1"), true, 10, 2L, "a", Datos.AHORA));
        repo().guardar(Producto.registrar("CLA-01", "Clavo", new BigDecimal("1"), true, 10, 1L, "a", Datos.AHORA));
        assertEquals(List.of("CLA-01", "MAR-01", "PIN-01"), codigos(repo().buscar(new FiltroProductos(null, false, false, Set.of()))));
        assertEquals(List.of("MAR-01"), codigos(repo().buscar(new FiltroProductos("MART", false, false, Set.of()))));
        assertEquals(List.of("PIN-01"), codigos(repo().buscar(new FiltroProductos("pin-0", false, false, Set.of()))));
        assertEquals(List.of("CLA-01", "MAR-01"), codigos(repo().buscar(new FiltroProductos("zzz", false, false, Set.of(1L)))));
        assertEquals(List.of("CLA-01", "PIN-01"), codigos(repo().buscar(new FiltroProductos("cla", false, false, Set.of(2L)))));
        assertTrue(repo().buscar(new FiltroProductos("zzz", false, false, Set.of())).isEmpty());
    }

    @Test
    void filtraPorActivosYStockBajo() {
        repo().guardar(Datos.producto("A-ALTO", "1", true, 50, 1));
        repo().guardar(Datos.producto("B-BAJO", "1", true, 5, 1));
        Producto c = repo().guardar(Datos.producto("C-CERO", "1", true, 0, 1));
        c.desactivar("admin", Datos.AHORA);
        repo().guardar(c);
        assertEquals(List.of("A-ALTO", "B-BAJO"), codigos(repo().buscar(new FiltroProductos(null, true, false, Set.of()))));
        assertEquals(List.of("B-BAJO", "C-CERO"), codigos(repo().buscar(new FiltroProductos(null, false, true, Set.of()))));
        assertEquals(List.of("B-BAJO"), codigos(repo().buscar(new FiltroProductos(null, true, true, Set.of()))));
    }

    @Test
    void buscaPorProveedor() {
        repo().guardar(Datos.producto("B-02", "1", true, 1, 1));
        repo().guardar(Datos.producto("A-01", "1", true, 1, 1));
        repo().guardar(Datos.producto("C-03", "1", true, 1, 2));
        assertEquals(List.of("A-01", "B-02"), codigos(repo().buscarPorProveedor(1)));
        assertEquals(List.of("C-03"), codigos(repo().buscarPorProveedor(2)));
        assertTrue(repo().buscarPorProveedor(99).isEmpty());
    }

    @Test
    void paginaLaBusquedaYLosProductosDeUnProveedor() {
        repo().guardar(Producto.registrar("E-05", "E5", new BigDecimal("1"), true, 1, 1L, "a", Datos.AHORA));
        repo().guardar(Producto.registrar("A-01", "A1", new BigDecimal("1"), true, 1, 1L, "a", Datos.AHORA));
        repo().guardar(Producto.registrar("C-03", "C3", new BigDecimal("1"), true, 1, 1L, "a", Datos.AHORA));
        FiltroProductos sinFiltros = new FiltroProductos(null, false, false, Set.of());

        Pagina<Producto> primera = repo().buscar(sinFiltros, Paginacion.de(1, 2));
        assertEquals(List.of("A-01", "C-03"), codigos(primera.contenido()));
        assertEquals(3, primera.total());
        assertEquals(2, primera.totalPaginas());

        Pagina<Producto> segunda = repo().buscar(sinFiltros, Paginacion.de(2, 2));
        assertEquals(List.of("E-05"), codigos(segunda.contenido()));

        Pagina<Producto> fuera = repo().buscar(sinFiltros, Paginacion.de(9, 2));
        assertTrue(fuera.contenido().isEmpty());
        assertEquals(3, fuera.total());

        Pagina<Producto> porProveedor = repo().buscarPorProveedor(1, Paginacion.de(1, 2));
        assertEquals(2, porProveedor.contenido().size());
        assertEquals(3, porProveedor.total());
    }
}
