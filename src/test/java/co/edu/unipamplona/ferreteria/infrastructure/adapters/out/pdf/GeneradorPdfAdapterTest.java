package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.LineaReporte;
import co.edu.unipamplona.ferreteria.domain.model.NumeroFactura;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.ResumenFactura;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class GeneradorPdfAdapterTest {

    private static final Charset WIN_ANSI = Charset.forName("windows-1252");
    private final GeneradorPdfAdapter adapter = new GeneradorPdfAdapter();

    @Test
    void elPdfEmpiezaYTerminaComoPdf() {
        byte[] pdf = adapter.factura(factura(1), Datos.NEGOCIO);
        assertEquals("%PDF-", new String(pdf, 0, 5, StandardCharsets.US_ASCII));
        assertTrue(new String(pdf, StandardCharsets.ISO_8859_1).endsWith("%%EOF"));
    }

    @Test
    void laFacturaIncluyeNumeroClienteLineasYTotales() {
        Factura factura = factura(1);
        String texto = new String(adapter.factura(factura, Datos.NEGOCIO), WIN_ANSI);
        assertTrue(texto.contains("FAC-2026-000001"), texto);
        assertTrue(texto.contains("Cliente \\(Prueba\\)"), texto);
        assertTrue(texto.contains("Tuerca ñandú"), texto);
        assertTrue(texto.contains("Total: $ 2.380,00"), texto);
    }

    @Test
    void escapaParentesisYConservaTildes() {
        String texto = new String(adapter.factura(factura(1), Datos.NEGOCIO), WIN_ANSI);
        assertTrue(texto.contains("\\("), "no escapó el paréntesis de apertura");
        assertTrue(texto.contains("\\)"), "no escapó el paréntesis de cierre");
        assertTrue(texto.contains("ñ"), "no conservó la eñe");
        assertTrue(texto.contains("ú"), "no conservó la tilde");
    }

    @Test
    void masDeCuarentaLineasGeneraVariasPaginas() {
        byte[] pdf = adapter.factura(factura(60), Datos.NEGOCIO);
        String texto = new String(pdf, StandardCharsets.ISO_8859_1);
        int paginas = texto.split("/MediaBox", -1).length - 1;
        assertTrue(paginas >= 2, "páginas generadas: " + paginas);
    }

    @Test
    void elReporteDiarioSinVentasLoDiceExplicitamente() {
        ReporteDiario vacio = new ReporteDiario(Datos.HOY, 0, 0, 0, Dinero.CERO, Dinero.CERO, Dinero.CERO,
                List.of(), List.of());
        String texto = new String(adapter.reporteDiario(vacio, Datos.NEGOCIO), WIN_ANSI);
        assertTrue(texto.contains("Sin ventas registradas"), texto);
    }

    @Test
    void elReporteDiarioIncluyeTotalesYFacturasAnuladas() {
        LineaReporte linea = new LineaReporte("P-1", "Tuerca", 2, Dinero.de("2000"), Dinero.de("380"),
                Dinero.de("2380"));
        ResumenFactura resumen = new ResumenFactura("FAC-2026-000001", Datos.AHORA, "Cliente", "vendedor",
                Dinero.de("2380"), true);
        ReporteDiario reporte = new ReporteDiario(Datos.HOY, 1, 1, 2, Dinero.de("2000"), Dinero.de("380"),
                Dinero.de("2380"), List.of(linea), List.of(resumen));
        String texto = new String(adapter.reporteDiario(reporte, Datos.NEGOCIO), WIN_ANSI);
        assertTrue(texto.contains("REPORTE DIARIO DE VENTAS"), texto);
        assertTrue(texto.contains("Total: $ 2.380,00"), texto);
        assertTrue(texto.contains("ANULADA"), texto);
    }

    private static Factura factura(int lineas) {
        List<LineaFactura> items = new ArrayList<>();
        for (int i = 0; i < lineas; i++) {
            items.add(new LineaFactura("P-" + i, "Tuerca ñandú " + i, 2, Dinero.de("1000"), true));
        }
        return Factura.emitir(NumeroFactura.de(2026, 1), "Cliente (Prueba)", "Calle 1", "3001234567", "vendedor",
                items, Datos.AHORA);
    }
}
