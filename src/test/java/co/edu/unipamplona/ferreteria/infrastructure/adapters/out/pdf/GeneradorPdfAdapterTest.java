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
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

class GeneradorPdfAdapterTest {

    private final GeneradorPdfAdapter adapter = new GeneradorPdfAdapter(engine());

    @Test
    void elPdfEmpiezaYTerminaComoPdf() {
        byte[] pdf = adapter.factura(factura(1), Datos.NEGOCIO);
        assertEquals("%PDF-", new String(pdf, 0, 5, StandardCharsets.US_ASCII));
        assertTrue(new String(pdf, StandardCharsets.ISO_8859_1).trim().endsWith("%%EOF"));
    }

    @Test
    void laFacturaIncluyeNumeroClienteLineasYTotales() throws IOException {
        String texto = texto(adapter.factura(factura(1), Datos.NEGOCIO));

        assertTrue(texto.contains("FAC-2026-000001"), texto);
        assertTrue(texto.contains("Cliente (Prueba)"), texto);
        assertTrue(texto.contains("Tuerca ñandú"), texto);
        assertTrue(texto.contains("Subtotal"), texto);
        assertTrue(texto.contains("Total"), texto);
        assertTrue(texto.contains("2.380,00"), texto);
    }

    @Test
    void incluyeElTotalEnLetras() throws IOException {
        String texto = texto(adapter.factura(factura(1), Datos.NEGOCIO));

        assertTrue(texto.contains("TOTAL EN LETRAS"), texto);
        assertTrue(texto.contains("dos mil trescientos ochenta pesos con 00/100"), texto);
    }

    @Test
    void incrustaElLogoComoImagen() throws IOException {
        byte[] pdf = adapter.factura(factura(1), Datos.NEGOCIO);

        try (PDDocument documento = PDDocument.load(pdf)) {
            boolean imagen = false;
            for (org.apache.pdfbox.cos.COSName nombre
                    : documento.getPage(0).getResources().getXObjectNames()) {
                if (documento.getPage(0).getResources().isImageXObject(nombre)) {
                    imagen = true;
                    break;
                }
            }
            assertTrue(imagen, "la factura debe incrustar el logo");
        }
    }

    @Test
    void conservaParentesisYCaracteresAcentuados() throws IOException {
        String texto = texto(adapter.factura(factura(1), Datos.NEGOCIO));

        assertTrue(texto.contains("(Prueba)"), "no conservó el paréntesis");
        assertTrue(texto.contains("ñ"), "no conservó la eñe");
        assertTrue(texto.contains("ú"), "no conservó la tilde");
    }

    @Test
    void unaFacturaAnuladaLoDiceEnElDocumento() throws IOException {
        Factura factura = factura(1);
        factura.anular("Error en el cobro", "admin", Datos.AHORA);

        String texto = texto(adapter.factura(factura, Datos.NEGOCIO));

        assertTrue(texto.contains("FACTURA ANULADA"), texto);
        assertTrue(texto.contains("Error en el cobro"), texto);
        assertTrue(texto.contains("admin"), texto);
    }

    @Test
    void masDeCuarentaLineasGeneraVariasPaginas() throws IOException {
        byte[] pdf = adapter.factura(factura(60), Datos.NEGOCIO);

        try (PDDocument documento = PDDocument.load(pdf)) {
            assertTrue(documento.getNumberOfPages() >= 2, "páginas generadas: " + documento.getNumberOfPages());
        }
    }

    @Test
    void elReporteDiarioSinVentasLoDiceExplicitamente() throws IOException {
        ReporteDiario vacio = new ReporteDiario(Datos.HOY, 0, 0, 0, Dinero.CERO, Dinero.CERO, Dinero.CERO,
                List.of(), List.of());

        String texto = texto(adapter.reporteDiario(vacio, Datos.NEGOCIO));

        assertTrue(texto.contains("Sin ventas registradas"), texto);
    }

    @Test
    void elReporteDiarioIncluyeTotalesYFacturasAnuladas() throws IOException {
        LineaReporte linea = new LineaReporte("P-1", "Tuerca", 2, Dinero.de("2000"), Dinero.de("380"),
                Dinero.de("2380"));
        ResumenFactura resumen = new ResumenFactura("FAC-2026-000001", Datos.AHORA, "Cliente", "vendedor",
                Dinero.de("2380"), true);
        ReporteDiario reporte = new ReporteDiario(Datos.HOY, 1, 1, 2, Dinero.de("2000"), Dinero.de("380"),
                Dinero.de("2380"), List.of(linea), List.of(resumen));

        String texto = texto(adapter.reporteDiario(reporte, Datos.NEGOCIO));

        assertTrue(texto.contains("Reporte de ventas"), texto);
        assertTrue(texto.contains("2.380,00"), texto);
        assertTrue(texto.contains("ANULADA"), texto);
    }

    private static SpringTemplateEngine engine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }

    private static String texto(byte[] pdf) throws IOException {
        try (PDDocument documento = PDDocument.load(pdf)) {
            return new PDFTextStripper().getText(documento);
        }
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
