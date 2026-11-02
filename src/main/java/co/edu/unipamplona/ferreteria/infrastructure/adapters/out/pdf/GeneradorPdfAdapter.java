package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.LineaReporte;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.ResumenFactura;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Genera la factura y el reporte diario como PDF a partir de plantillas HTML (Thymeleaf)
 * renderizadas con openhtmltopdf. Los totales vienen del dominio: la plantilla solo los muestra.
 */
@Component
public class GeneradorPdfAdapter implements GeneradorPdfPort {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Locale COLOMBIA = Locale.forLanguageTag("es-CO");

    private final TemplateEngine templateEngine;
    private final String logo;

    public GeneradorPdfAdapter(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
        this.logo = cargarLogo();
    }

    @Override
    public byte[] factura(Factura factura, DatosNegocio negocio) {
        Context contexto = new Context(COLOMBIA);
        contexto.setVariable("negocio", negocio(negocio));
        contexto.setVariable("factura", factura(factura));
        contexto.setVariable("logo", logo);
        return render("factura", contexto);
    }

    @Override
    public byte[] reporteDiario(ReporteDiario reporte, DatosNegocio negocio) {
        Context contexto = new Context(COLOMBIA);
        contexto.setVariable("negocio", negocio(negocio));
        contexto.setVariable("reporte", reporte(reporte));
        contexto.setVariable("logo", logo);
        return render("reporte-diario", contexto);
    }

    private byte[] render(String plantilla, Context contexto) {
        String html = templateEngine.process(plantilla, contexto);
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            registrarFuentes(builder);
            builder.withProducer("Ferreteria Ambiente Murano 3D");
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(salida);
            builder.run();
            return salida.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el PDF de " + plantilla, e);
        }
    }

    private static VistasPdf.Negocio negocio(DatosNegocio negocio) {
        return new VistasPdf.Negocio(texto(negocio.nombre()), texto(negocio.ciudad()), texto(negocio.direccion()),
                texto(negocio.telefono()), texto(negocio.identificacion()));
    }

    private static VistasPdf.Factura factura(Factura factura) {
        List<VistasPdf.LineaFactura> lineas = factura.getLineas().stream()
                .map(GeneradorPdfAdapter::linea)
                .toList();
        return new VistasPdf.Factura(factura.getNumero().valor(),
                factura.getFecha().atZone(BOGOTA).format(FECHA_HORA),
                factura.getEstado().name(),
                texto(factura.getClienteNombre()),
                texto(factura.getClienteDireccion()),
                texto(factura.getClienteTelefono()),
                texto(factura.getVendedor()),
                factura.estaAnulada(),
                texto(factura.getMotivoAnulacion()),
                texto(factura.getAnuladaPor()),
                lineas,
                moneda(factura.subtotal()),
                moneda(factura.iva()),
                moneda(factura.total()),
                NumeroALetras.pesos(factura.total()));
    }

    private static VistasPdf.LineaFactura linea(LineaFactura linea) {
        return new VistasPdf.LineaFactura(linea.codigoProducto(), linea.nombreProducto(), linea.cantidad(),
                moneda(linea.precioBase()), moneda(linea.subtotal()), moneda(linea.iva()), moneda(linea.total()));
    }

    private static VistasPdf.Reporte reporte(ReporteDiario reporte) {
        List<VistasPdf.LineaReporte> productos = reporte.productos().stream()
                .map(GeneradorPdfAdapter::lineaReporte)
                .toList();
        List<VistasPdf.ResumenFactura> facturas = reporte.facturas().stream()
                .map(GeneradorPdfAdapter::resumen)
                .toList();
        return new VistasPdf.Reporte(reporte.fecha().format(FECHA), reporte.sinVentas(),
                reporte.facturasEmitidas(), reporte.facturasAnuladas(), reporte.unidadesVendidas(),
                moneda(reporte.subtotal()), moneda(reporte.iva()), moneda(reporte.total()),
                productos, facturas);
    }

    private static VistasPdf.LineaReporte lineaReporte(LineaReporte linea) {
        return new VistasPdf.LineaReporte(linea.codigoProducto(), linea.nombreProducto(), linea.cantidad(),
                moneda(linea.subtotal()), moneda(linea.iva()), moneda(linea.total()));
    }

    private static VistasPdf.ResumenFactura resumen(ResumenFactura resumen) {
        return new VistasPdf.ResumenFactura(resumen.numero(), resumen.fecha().atZone(BOGOTA).format(FECHA_HORA),
                texto(resumen.cliente()), texto(resumen.vendedor()), moneda(resumen.total()), resumen.anulada());
    }

    private static String moneda(Dinero dinero) {
        return "$ " + String.format(COLOMBIA, "%,.2f", dinero.valor());
    }

    private static String texto(String valor) {
        return valor == null ? "" : valor;
    }

    private static void registrarFuentes(PdfRendererBuilder builder) {
        fuente(builder, "/fonts/Lato-Regular.ttf", "Lato", 400);
        fuente(builder, "/fonts/Lato-Bold.ttf", "Lato", 700);
        fuente(builder, "/fonts/IBMPlexMono-Regular.ttf", "PlexMono", 400);
    }

    private static void fuente(PdfRendererBuilder builder, String ruta, String familia, int peso) {
        builder.useFont(() -> recurso(ruta), familia, peso, FontStyle.NORMAL, true);
    }

    private static InputStream recurso(String ruta) {
        InputStream entrada = GeneradorPdfAdapter.class.getResourceAsStream(ruta);
        if (entrada == null) {
            throw new IllegalStateException("No se encontro el recurso " + ruta);
        }
        return entrada;
    }

    private static String cargarLogo() {
        try (InputStream entrada = GeneradorPdfAdapter.class.getResourceAsStream("/images/logo.jpg")) {
            if (entrada == null) {
                return null;
            }
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(entrada.readAllBytes());
        } catch (IOException e) {
            return null;
        }
    }
}
