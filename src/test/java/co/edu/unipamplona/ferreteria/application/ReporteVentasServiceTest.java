package co.edu.unipamplona.ferreteria.application;

import static co.edu.unipamplona.ferreteria.application.Escenario.item;
import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.in.DocumentoPdf;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReporteVentasServiceTest {

    private final Escenario e = new Escenario();

    @BeforeEach
    void preparar() {
        Proveedor p = e.proveedor("Aceros del Norte");
        e.producto("MAR-01", "10000", true, 100, p);
        e.producto("CLA-01", "1500", false, 500, p);
    }

    @Test
    @DisplayName("Reporte del día: productos, cantidades, valores y total, de mayor a menor venta")
    void reporteDelDia() {
        e.vender("Ana", item("MAR-01", 2), item("CLA-01", 10));
        e.avanzar(Duration.ofHours(1));
        e.vender("Beto", item("MAR-01", 1));
        ReporteDiario r = e.reporte.diario(e.admin(), "2026-10-20");
        assertEquals(2, r.facturasEmitidas());
        assertEquals(13, r.unidadesVendidas());
        assertEquals(2, r.productos().size());
        assertEquals("CLA-01", r.productos().get(0).codigoProducto());       // 10 unidades
        assertEquals(10, r.productos().get(0).cantidad());
        assertEquals("MAR-01", r.productos().get(1).codigoProducto());       // 3 unidades
        assertEquals(3, r.productos().get(1).cantidad());
        assertEquals(Dinero.de("35700"), r.productos().get(1).total());
        assertEquals(Dinero.de("45000"), r.subtotal());
        assertEquals(Dinero.de("5700"), r.iva());
        assertEquals(Dinero.de("50700"), r.total());
        assertFalse(r.sinVentas());
    }

    @Test
    @DisplayName("Las facturas anuladas no se cuentan")
    void ignoraAnuladas() {
        e.vender("Ana", item("MAR-01", 2));
        e.vender("Beto", item("MAR-01", 5));
        e.venta.anular(e.admin(), "FAC-2026-000002", "Error de digitación");
        ReporteDiario r = e.reporte.diario(e.admin(), "2026-10-20");
        assertEquals(1, r.facturasEmitidas());
        assertEquals(1, r.facturasAnuladas());
        assertEquals(2, r.unidadesVendidas());
        assertEquals(Dinero.de("23800"), r.total());
    }

    @Test
    @DisplayName("Un día sin ventas devuelve un reporte vacío que lo indica, no un error")
    void sinVentas() {
        e.vender("Ana", item("MAR-01", 2));
        ReporteDiario r = e.reporte.diario(e.admin(), "2026-10-19");
        assertTrue(r.sinVentas());
        assertEquals(Dinero.CERO, r.total());
        assertTrue(e.reporte.diario(e.admin(), "2030-01-01").sinVentas());
    }

    @Test
    @DisplayName("El día es el de Bogotá: una venta a las 22:00 locales (03:00 UTC del día siguiente) sigue siendo de ese día")
    void diaEnZonaDeBogota() {
        e.avanzar(Duration.ofHours(12));            // 21 oct 03:00 UTC = 20 oct 22:00 en Bogotá
        e.vender("Noche", item("MAR-01", 1));
        e.avanzar(Duration.ofHours(2));             // 21 oct 05:00 UTC = 21 oct 00:00 en Bogotá
        e.vender("Madrugada", item("MAR-01", 1));
        assertEquals(1, e.reporte.diario(e.admin(), "2026-10-20").facturasEmitidas());
        assertEquals("Noche", e.reporte.diario(e.admin(), "2026-10-20").facturas().get(0).cliente());
        assertEquals(1, e.reporte.diario(e.admin(), "2026-10-21").facturasEmitidas());
    }

    @Test
    @DisplayName("Fecha obligatoria y con formato AAAA-MM-DD (400); solo el administrador (403)")
    void validaciones() {
        assertThrows(ValorInvalidoException.class, () -> e.reporte.diario(e.admin(), ""));
        assertThrows(ValorInvalidoException.class, () -> e.reporte.diario(e.admin(), null));
        assertThrows(ValorInvalidoException.class, () -> e.reporte.diario(e.admin(), "20/10/2026"));
        assertThrows(ValorInvalidoException.class, () -> e.reporte.diario(e.admin(), "2026-02-30"));
        assertThrows(AccesoDenegadoException.class, () -> e.reporte.diario(e.vendedor(), "2026-10-20"));
        assertThrows(AccesoDenegadoException.class, () -> e.reporte.pdf(e.vendedor(), "2026-10-20"));
    }

    @Test
    @DisplayName("El PDF del reporte se nombra con la fecha")
    void pdf() {
        DocumentoPdf pdf = e.reporte.pdf(e.admin(), "2026-10-20");
        assertEquals("reporte-ventas-2026-10-20.pdf", pdf.nombreArchivo());
        assertTrue(pdf.contenido().length > 0);
    }
}
