package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.domain.service.ReporteDiarioService;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReporteDiarioServiceTest {

    private final ReporteDiarioService servicio = new ReporteDiarioService();

    private Factura f(String numero, int minuto, boolean anulada, LineaFactura... lineas) {
        return Datos.factura(numero, Datos.AHORA.plusSeconds(60L * minuto), "Cliente " + numero, anulada, lineas);
    }

    @Test
    @DisplayName("Sin facturas el reporte lo dice, con ceros y listas vacías")
    void sinVentas() {
        ReporteDiario r = servicio.construir(Datos.HOY, List.of());
        assertTrue(r.sinVentas());
        assertEquals(0, r.unidadesVendidas());
        assertEquals(Dinero.CERO, r.total());
        assertTrue(r.productos().isEmpty());
    }

    @Test
    @DisplayName("Agrupa por producto, suma cantidades y valores, y ordena de mayor a menor venta")
    void agrupaYOrdena() {
        ReporteDiario r = servicio.construir(Datos.HOY, List.of(
                f("FAC-2026-000001", 1, false, Datos.linea("TOR-01", 10, "200", true), Datos.linea("MAR-01", 1, "20000", true)),
                f("FAC-2026-000002", 2, false, Datos.linea("TOR-01", 5, "200", true), Datos.linea("CLA-01", 15, "100", false))));
        assertEquals(2, r.facturasEmitidas());
        assertEquals(31, r.unidadesVendidas());
        assertEquals(3, r.productos().size());
        // TOR-01 y CLA-01 venden 15 unidades; gana TOR-01 por mayor valor (3.570 > 1.500). MAR-01 vende 1.
        assertEquals("TOR-01", r.productos().get(0).codigoProducto());
        assertEquals(15, r.productos().get(0).cantidad());
        assertEquals(Dinero.de("3000"), r.productos().get(0).subtotal());
        assertEquals(Dinero.de("570"), r.productos().get(0).iva());
        assertEquals(Dinero.de("3570"), r.productos().get(0).total());
        assertEquals("CLA-01", r.productos().get(1).codigoProducto());
        assertEquals("MAR-01", r.productos().get(2).codigoProducto());
        // subtotal: 2000 + 20000 + 1000 + 1500 = 24.500; IVA: 380 + 3800 + 190 = 4.370
        assertEquals(Dinero.de("24500"), r.subtotal());
        assertEquals(Dinero.de("4370"), r.iva());
        assertEquals(Dinero.de("28870"), r.total());
    }

    @Test
    @DisplayName("Las facturas anuladas no se cuentan, pero se listan marcadas")
    void ignoraAnuladas() {
        ReporteDiario r = servicio.construir(Datos.HOY, List.of(
                f("FAC-2026-000001", 1, false, Datos.linea("A", 2, "1000", false)),
                f("FAC-2026-000002", 2, true, Datos.linea("A", 100, "1000", false))));
        assertEquals(1, r.facturasEmitidas());
        assertEquals(1, r.facturasAnuladas());
        assertEquals(2, r.unidadesVendidas());
        assertEquals(Dinero.de("2000"), r.total());
        assertEquals(2, r.facturas().size());
        assertFalse(r.facturas().get(0).anulada());
        assertTrue(r.facturas().get(1).anulada());
    }

    @Test
    @DisplayName("Si todas las facturas del día están anuladas, el día cuenta como sin ventas")
    void todasAnuladas() {
        ReporteDiario r = servicio.construir(Datos.HOY, List.of(f("FAC-2026-000001", 1, true, Datos.linea("A", 2, "1000", false))));
        assertTrue(r.sinVentas());
        assertEquals(1, r.facturasAnuladas());
        assertEquals(Dinero.CERO, r.total());
    }

    @Test
    @DisplayName("Con igual cantidad y valor, el desempate es por código")
    void desempatePorCodigo() {
        ReporteDiario r = servicio.construir(Datos.HOY, List.of(
                f("FAC-2026-000001", 1, false, Datos.linea("B", 1, "100", false), Datos.linea("A", 1, "100", false))));
        assertEquals("A", r.productos().get(0).codigoProducto());
        assertEquals("B", r.productos().get(1).codigoProducto());
    }
}
