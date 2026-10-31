package co.edu.unipamplona.ferreteria.application;

import static co.edu.unipamplona.ferreteria.application.Escenario.item;
import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.in.DocumentoPdf;
import co.edu.unipamplona.ferreteria.application.port.in.command.*;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class VentaServiceTest {

    private final Escenario e = new Escenario();
    private Proveedor proveedor;

    @BeforeEach
    void preparar() {
        proveedor = e.proveedor("Aceros del Norte");
        e.producto("MAR-01", "10000", true, 10, proveedor);    // lleva IVA
        e.producto("CLA-01", "1500", false, 20, proveedor);    // sin IVA
    }

    @Test
    @DisplayName("Emite la factura con número, fecha, vendedor, líneas y totales calculados")
    void emiteFactura() {
        Factura f = e.vender("Ana Pérez", item("MAR-01", 2), item("CLA-01", 3));
        assertEquals("FAC-2026-000001", f.getNumero().valor());
        assertEquals(Datos.AHORA, f.getFecha());
        assertEquals("vendedor1@murano3d.co", f.getVendedor());
        assertEquals("Ana Pérez", f.getClienteNombre());
        assertEquals(2, f.getLineas().size());
        assertEquals(Dinero.de("24500.00"), f.subtotal());
        assertEquals(Dinero.de("3800.00"), f.iva());
        assertEquals(Dinero.de("28300.00"), f.total());
        assertEquals(EstadoFactura.EMITIDA, f.getEstado());
        assertNotNull(f.getId());
    }

    @Test
    @DisplayName("Al confirmar la venta el stock de cada producto disminuye exactamente lo vendido")
    void descuentaStock() {
        e.vender("Ana", item("MAR-01", 2), item("CLA-01", 3));
        assertEquals(8, e.stock("MAR-01"));
        assertEquals(17, e.stock("CLA-01"));
    }

    @Test
    @DisplayName("Un producto repetido en varias líneas se suma y se descuenta una sola vez por el total")
    void productoRepetido() {
        Factura f = e.vender("Ana", item("MAR-01", 2), item("MAR-01", 3));
        assertEquals(1, f.getLineas().size());
        assertEquals(5, f.getLineas().get(0).cantidad());
        assertEquals(5, e.stock("MAR-01"));
    }

    @Test
    @DisplayName("Los números son consecutivos y el año nuevo empieza de nuevo")
    void consecutivo() {
        assertEquals("FAC-2026-000001", e.vender("Ana", item("MAR-01", 1)).getNumero().valor());
        assertEquals("FAC-2026-000002", e.vender("Beto", item("MAR-01", 1)).getNumero().valor());
        e.avanzar(Duration.ofDays(75));   // 3 de enero de 2027
        assertEquals("FAC-2027-000001", e.vender("Cata", item("MAR-01", 1)).getNumero().valor());
    }

    @Test
    @DisplayName("Si no hay stock suficiente la venta se cancela: no hay factura, no cambia el stock y no se gasta el número")
    void stockInsuficienteNoDejaRastro() {
        StockInsuficienteException ex = assertThrows(StockInsuficienteException.class,
                () -> e.vender("Ana", item("CLA-01", 3), item("MAR-01", 11)));
        assertEquals(1, ex.getFaltantes().size());
        assertEquals("MAR-01", ex.getFaltantes().get(0).codigo());
        assertEquals(10, e.stock("MAR-01"));
        assertEquals(20, e.stock("CLA-01"));                       // lo que sí alcanzaba tampoco se descontó
        assertTrue(e.facturas.buscarPorNumero("FAC-2026-000001").isEmpty());
    }

    @Test
    @DisplayName("Pedir justo lo que hay es válido y deja el stock en cero")
    void justoElStock() {
        e.vender("Ana", item("MAR-01", 10));
        assertEquals(0, e.stock("MAR-01"));
        assertThrows(StockInsuficienteException.class, () -> e.vender("Beto", item("MAR-01", 1)));
        assertEquals(0, e.stock("MAR-01"));
    }

    @Test
    @DisplayName("Productos inexistentes: 404 que nombra todos los que faltan; desactivados: 409")
    void productosInvalidos() {
        ProductoNoEncontradoException ex = assertThrows(ProductoNoEncontradoException.class,
                () -> e.vender("Ana", item("NO-1", 1), item("MAR-01", 1), item("NO-2", 1)));
        assertTrue(ex.getMessage().contains("NO-1") && ex.getMessage().contains("NO-2"));
        assertEquals(10, e.stock("MAR-01"));
        e.catalogo.desactivarProducto(e.admin(), "MAR-01");
        assertThrows(EstadoInvalidoException.class, () -> e.vender("Ana", item("MAR-01", 1)));
    }

    @Test
    @DisplayName("Valida el cliente, los productos y las cantidades (400) antes de tocar nada")
    void validaDatos() {
        assertThrows(ValorInvalidoException.class, () -> e.venta.emitir(e.vendedor(), new EmitirFacturaCommand("", null, null, List.of(item("MAR-01", 1)))));
        assertThrows(ValorInvalidoException.class, () -> e.venta.emitir(e.vendedor(), new EmitirFacturaCommand("Ana", null, null, List.of())));
        assertThrows(ValorInvalidoException.class, () -> e.venta.emitir(e.vendedor(), new EmitirFacturaCommand("Ana", null, null, null)));
        assertThrows(ValorInvalidoException.class, () -> e.vender("Ana", item("MAR-01", 0)));
        assertThrows(ValorInvalidoException.class, () -> e.vender("Ana", item("MAR-01", -3)));
        assertThrows(ValorInvalidoException.class, () -> e.vender("Ana", item(null, 1)));
        assertThrows(ValorInvalidoException.class, () -> e.vender("Ana", new ItemVentaCommand("MAR-01", null)));
        assertThrows(ValorInvalidoException.class, () -> e.vender("Ana", item("código malo!", 1)));
        assertThrows(ValorInvalidoException.class, () -> e.venta.emitir(e.vendedor(),
                new EmitirFacturaCommand("Ana", null, "teléfono-malo", List.of(item("MAR-01", 1)))));
        assertEquals(10, e.stock("MAR-01"));
    }

    @Test
    @DisplayName("Una cuenta sin rol conocido no vende (403)")
    void sinRolNoVende() {
        Actor sinRol = Actor.de("x@murano3d.co", List.of("OTRO"));
        assertThrows(AccesoDenegadoException.class,
                () -> e.venta.emitir(sinRol, new EmitirFacturaCommand("Ana", null, null, List.of(item("MAR-01", 1)))));
    }

    @Test
    @DisplayName("El administrador también puede vender")
    void adminVende() {
        Factura f = e.venta.emitir(e.admin(), new EmitirFacturaCommand("Ana", null, null, List.of(item("MAR-01", 1))));
        assertEquals("admin@murano3d.co", f.getVendedor());
    }

    @Test
    @DisplayName("Nombre y precio quedan congelados: cambiar el producto después no altera una factura emitida")
    void datosCongelados() {
        Factura f = e.vender("Ana", item("MAR-01", 2));
        e.catalogo.editarProducto(e.admin(), new EditarProductoCommand("MAR-01", "Otro nombre", new BigDecimal("99999"), false, proveedor.getId()));
        Factura despues = e.venta.consultar(e.vendedor(), f.getNumero().valor());
        assertEquals("Producto MAR-01", despues.getLineas().get(0).nombreProducto());
        assertEquals(Dinero.de("10000.00"), despues.getLineas().get(0).precioBase());
        assertEquals(Dinero.de("23800.00"), despues.total());
    }

    @Test
    @DisplayName("Consulta por número (sin importar mayúsculas); 404 si no existe y 400 si el formato es inválido")
    void consulta() {
        Factura f = e.vender("Ana", item("MAR-01", 1));
        assertEquals(f.getNumero(), e.venta.consultar(e.vendedor(), "fac-2026-000001").getNumero());
        assertThrows(FacturaNoEncontradaException.class, () -> e.venta.consultar(e.vendedor(), "FAC-2026-000099"));
        assertThrows(ValorInvalidoException.class, () -> e.venta.consultar(e.vendedor(), "123"));
    }

    // ---- anulación ----

    @Test
    @DisplayName("El administrador anula una factura: queda ANULADA con motivo y responsable, y el stock se devuelve")
    void anula() {
        e.vender("Ana", item("MAR-01", 2), item("CLA-01", 3));
        e.avanzar(Duration.ofMinutes(30));
        Factura f = e.venta.anular(e.admin(), "FAC-2026-000001", "El cliente devolvió el pedido");
        assertTrue(f.estaAnulada());
        assertEquals("admin@murano3d.co", f.getAnuladaPor());
        assertEquals("El cliente devolvió el pedido", f.getMotivoAnulacion());
        assertEquals(Datos.AHORA.plusSeconds(1800), f.getAnuladaEn());
        assertEquals(10, e.stock("MAR-01"));
        assertEquals(20, e.stock("CLA-01"));
        assertTrue(e.venta.consultar(e.vendedor(), "FAC-2026-000001").estaAnulada());
    }

    @Test
    @DisplayName("Anular dos veces es un conflicto y no devuelve el stock dos veces")
    void noSeAnulaDosVeces() {
        e.vender("Ana", item("MAR-01", 2));
        e.venta.anular(e.admin(), "FAC-2026-000001", "Error de digitación");
        assertThrows(EstadoInvalidoException.class, () -> e.venta.anular(e.admin(), "FAC-2026-000001", "Otra vez"));
        assertEquals(10, e.stock("MAR-01"));
    }

    @Test
    @DisplayName("Solo el administrador anula (403); el motivo es obligatorio (400) y la factura debe existir (404)")
    void anulacionValida() {
        e.vender("Ana", item("MAR-01", 2));
        assertThrows(AccesoDenegadoException.class, () -> e.venta.anular(e.vendedor(), "FAC-2026-000001", "Error de digitación"));
        assertThrows(ValorInvalidoException.class, () -> e.venta.anular(e.admin(), "FAC-2026-000001", " "));
        assertThrows(ValorInvalidoException.class, () -> e.venta.anular(e.admin(), "FAC-2026-000001", "no"));
        assertThrows(FacturaNoEncontradaException.class, () -> e.venta.anular(e.admin(), "FAC-2026-000099", "Error de digitación"));
        assertEquals(8, e.stock("MAR-01"));
    }

    // ---- PDF ----

    @Test
    @DisplayName("El PDF de la factura se nombra con su número y se pide al generador con los datos del negocio")
    void pdfDeLaFactura() {
        e.vender("Ana", item("MAR-01", 1));
        DocumentoPdf pdf = e.venta.pdf(e.vendedor(), "FAC-2026-000001");
        assertEquals("factura-FAC-2026-000001.pdf", pdf.nombreArchivo());
        assertEquals("FACTURA FAC-2026-000001 Ferretería Ambiente Murano 3D", new String(pdf.contenido(), StandardCharsets.UTF_8));
        assertThrows(FacturaNoEncontradaException.class, () -> e.venta.pdf(e.vendedor(), "FAC-2026-000099"));
    }
}
