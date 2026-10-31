package co.edu.unipamplona.ferreteria.application;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.in.CompraDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.command.*;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CompraServiceTest {

    private final Escenario e = new Escenario();
    private Proveedor aceros;
    private Proveedor bodega;

    @BeforeEach
    void preparar() {
        aceros = e.proveedor("Aceros del Norte");
        bodega = e.proveedor("Bodega Central");
        e.producto("MAR-01", "25000", true, 4, aceros);
        e.producto("CLA-01", "100", false, 0, aceros);
    }

    private ItemCompraCommand it(String codigo, int cantidad, String precio) {
        return new ItemCompraCommand(codigo, cantidad, new BigDecimal(precio));
    }

    private CompraDetalle comprar(Proveedor p, String fecha, ItemCompraCommand... items) {
        return e.compra.registrar(e.admin(), new RegistrarCompraCommand(p.getId(), fecha, List.of(items)));
    }

    @Test
    @DisplayName("Al confirmar la compra, el stock de cada producto aumenta en lo adquirido")
    void aumentaStock() {
        comprar(aceros, null, it("MAR-01", 6, "18000"), it("CLA-01", 500, "60"));
        assertEquals(10, e.stock("MAR-01"));
        assertEquals(500, e.stock("CLA-01"));
    }

    @Test
    @DisplayName("Guarda proveedor, fecha, responsable y código consultable; si no se indica fecha usa la de hoy")
    void guardaDatos() {
        CompraDetalle d = comprar(aceros, null, it("MAR-01", 6, "18000"));
        Compra c = d.compra();
        assertEquals("CMP-000001", c.codigo());
        assertEquals(aceros.getId().longValue(), c.getProveedorId());
        assertEquals("Aceros del Norte", d.proveedorNombre());
        assertEquals(java.time.LocalDate.of(2026, 10, 20), c.getFecha());
        assertEquals("admin@murano3d.co", c.getRegistradaPor());
        assertEquals(Dinero.de("108000.00"), c.total());
        CompraDetalle leida = e.compra.consultar(e.admin(), "CMP-000001");
        assertEquals("Aceros del Norte", leida.proveedorNombre());
        assertEquals(1, leida.compra().getLineas().size());
        assertEquals(Dinero.de("18000.00"), leida.compra().getLineas().get(0).precioUnitario());
    }

    @Test
    @DisplayName("Acepta una fecha pasada y rechaza una futura o ilegible")
    void fechas() {
        assertEquals(java.time.LocalDate.of(2026, 9, 1), comprar(aceros, "2026-09-01", it("MAR-01", 1, "100")).compra().getFecha());
        assertThrows(ValorInvalidoException.class, () -> comprar(aceros, "2026-10-21", it("MAR-01", 1, "100")));
        assertThrows(ValorInvalidoException.class, () -> comprar(aceros, "ayer", it("MAR-01", 1, "100")));
        assertEquals(5, e.stock("MAR-01"));       // 4 + la compra válida
    }

    @Test
    @DisplayName("Todo o nada: si una línea es inválida no se guarda la compra ni cambia ningún stock")
    void todoONada() {
        assertThrows(ProductoNoEncontradoException.class, () -> comprar(aceros, null, it("MAR-01", 6, "18000"), it("NO-1", 1, "5")));
        assertThrows(ValorInvalidoException.class, () -> comprar(aceros, null, it("MAR-01", 6, "18000"), it("CLA-01", 1, "0")));
        assertThrows(ValorInvalidoException.class, () -> comprar(aceros, null, it("MAR-01", 6, "18000"), it("CLA-01", 0, "5")));
        assertThrows(ValorInvalidoException.class, () -> comprar(aceros, null, it("MAR-01", 6, "18000"), it("CLA-01", 1, "-5")));
        assertThrows(ValorInvalidoException.class, () -> comprar(aceros, null, it("MAR-01", 6, "18000"), it("MAR-01", 1, "5")));
        assertEquals(4, e.stock("MAR-01"));
        assertEquals(0, e.stock("CLA-01"));
        assertTrue(e.compras.buscar(new co.edu.unipamplona.ferreteria.application.port.out.FiltroCompras(null, null, null, null)).isEmpty());
    }

    @Test
    @DisplayName("El proveedor debe existir (404); sin proveedor o sin productos es 400; un producto desactivado es 409")
    void validaProveedorYProductos() {
        assertThrows(ProveedorNoEncontradoException.class,
                () -> e.compra.registrar(e.admin(), new RegistrarCompraCommand(999L, null, List.of(it("MAR-01", 1, "5")))));
        assertThrows(ValorInvalidoException.class,
                () -> e.compra.registrar(e.admin(), new RegistrarCompraCommand(null, null, List.of(it("MAR-01", 1, "5")))));
        assertThrows(ValorInvalidoException.class,
                () -> e.compra.registrar(e.admin(), new RegistrarCompraCommand(aceros.getId(), null, List.of())));
        assertThrows(ValorInvalidoException.class,
                () -> e.compra.registrar(e.admin(), new RegistrarCompraCommand(aceros.getId(), null, null)));
        e.catalogo.desactivarProducto(e.admin(), "MAR-01");
        assertThrows(EstadoInvalidoException.class, () -> comprar(aceros, null, it("MAR-01", 1, "5")));
    }

    @Test
    @DisplayName("Solo el administrador compra y consulta compras (403)")
    void permisos() {
        assertThrows(AccesoDenegadoException.class, () -> e.compra.registrar(e.vendedor(),
                new RegistrarCompraCommand(aceros.getId(), null, List.of(it("MAR-01", 1, "5")))));
        comprar(aceros, null, it("MAR-01", 1, "5"));
        assertThrows(AccesoDenegadoException.class, () -> e.compra.consultar(e.vendedor(), "CMP-000001"));
        assertThrows(AccesoDenegadoException.class, () -> e.compra.listar(e.vendedor(), new ConsultarComprasQuery(null, null, null, null)));
    }

    @Test
    @DisplayName("Consultar: 404 si no existe y 400 si el código no tiene el formato")
    void consulta() {
        assertThrows(CompraNoEncontradaException.class, () -> e.compra.consultar(e.admin(), "CMP-000099"));
        assertThrows(ValorInvalidoException.class, () -> e.compra.consultar(e.admin(), "xx"));
    }

    @Test
    @DisplayName("Lista las compras de la más reciente a la más antigua y filtra por proveedor, fechas y producto")
    void listaYFiltra() {
        comprar(aceros, "2026-09-01", it("MAR-01", 1, "100"));
        comprar(bodega, "2026-09-15", it("MAR-01", 1, "110"), it("CLA-01", 10, "5"));
        comprar(aceros, "2026-10-01", it("CLA-01", 1, "6"));
        assertEquals(List.of("CMP-000003", "CMP-000002", "CMP-000001"), codigos(new ConsultarComprasQuery(null, null, null, null)));
        assertEquals(List.of("CMP-000003", "CMP-000001"), codigos(new ConsultarComprasQuery(aceros.getId(), null, null, null)));
        assertEquals(List.of("CMP-000002"), codigos(new ConsultarComprasQuery(null, "2026-09-10", "2026-09-30", null)));
        assertEquals(List.of("CMP-000002", "CMP-000001"), codigos(new ConsultarComprasQuery(null, null, null, "mar-01")));
        assertEquals(List.of("CMP-000002"), codigos(new ConsultarComprasQuery(null, "2026-09-15", "2026-09-15", null)));
        assertThrows(ValorInvalidoException.class, () -> e.compra.listar(e.admin(), new ConsultarComprasQuery(null, "2026-10-01", "2026-09-01", null)));
        assertThrows(ValorInvalidoException.class, () -> e.compra.listar(e.admin(), new ConsultarComprasQuery(null, "mañana", null, null)));
    }

    private List<String> codigos(ConsultarComprasQuery q) {
        return e.compra.listar(e.admin(), q).stream().map(d -> d.compra().codigo()).toList();
    }
}
