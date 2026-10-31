package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.LineaReporte;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.ResumenFactura;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Component;

/** Genera la factura y el reporte diario como PDF, con los mismos totales del dominio. */
@Component
public class GeneradorPdfAdapter implements GeneradorPdfPort {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Locale COLOMBIA = Locale.forLanguageTag("es-CO");

    @Override
    public byte[] factura(Factura factura, DatosNegocio negocio) {
        PdfSimple pdf = new PdfSimple();
        encabezado(pdf, negocio);
        pdf.linea();
        pdf.linea("FACTURA DE VENTA No. " + factura.getNumero());
        pdf.linea("Fecha: " + factura.getFecha().atZone(BOGOTA).format(FECHA_HORA));
        pdf.linea("Cliente: " + factura.getClienteNombre());
        pdf.linea("Direccion: " + texto(factura.getClienteDireccion()));
        pdf.linea("Telefono: " + texto(factura.getClienteTelefono()));
        pdf.linea("Vendedor: " + factura.getVendedor());
        if (factura.estaAnulada()) {
            pdf.linea();
            pdf.linea("*** ANULADA ***");
            pdf.linea("Motivo: " + texto(factura.getMotivoAnulacion()));
            pdf.linea("Anulada por: " + texto(factura.getAnuladaPor()));
        }
        pdf.linea();
        pdf.linea("Codigo  Producto  Cant  Precio  IVA  Total");
        for (LineaFactura linea : factura.getLineas()) {
            pdf.linea(linea.codigoProducto() + "  " + linea.nombreProducto() + "  " + linea.cantidad() + "  "
                    + moneda(linea.precioBase()) + "  " + moneda(linea.iva()) + "  " + moneda(linea.total()));
        }
        pdf.linea();
        pdf.linea("Subtotal: " + moneda(factura.subtotal()));
        pdf.linea("IVA: " + moneda(factura.iva()));
        pdf.linea("Total: " + moneda(factura.total()));
        return pdf.construir();
    }

    @Override
    public byte[] reporteDiario(ReporteDiario reporte, DatosNegocio negocio) {
        PdfSimple pdf = new PdfSimple();
        encabezado(pdf, negocio);
        pdf.linea();
        pdf.linea("REPORTE DIARIO DE VENTAS");
        pdf.linea("Fecha: " + reporte.fecha().format(FECHA));
        pdf.linea();
        if (reporte.sinVentas()) {
            pdf.linea("Sin ventas registradas en la fecha.");
            return pdf.construir();
        }
        pdf.linea("Facturas emitidas: " + reporte.facturasEmitidas());
        pdf.linea("Facturas anuladas: " + reporte.facturasAnuladas());
        pdf.linea("Unidades vendidas: " + reporte.unidadesVendidas());
        pdf.linea("Subtotal: " + moneda(reporte.subtotal()));
        pdf.linea("IVA: " + moneda(reporte.iva()));
        pdf.linea("Total: " + moneda(reporte.total()));
        pdf.linea();
        pdf.linea("Producto  Cant  Subtotal  IVA  Total");
        for (LineaReporte linea : reporte.productos()) {
            pdf.linea(linea.codigoProducto() + "  " + linea.nombreProducto() + "  " + linea.cantidad() + "  "
                    + moneda(linea.subtotal()) + "  " + moneda(linea.iva()) + "  " + moneda(linea.total()));
        }
        pdf.linea();
        pdf.linea("Facturas del dia:");
        for (ResumenFactura resumen : reporte.facturas()) {
            pdf.linea(resumen.numero() + "  " + resumen.fecha().atZone(BOGOTA).format(FECHA_HORA) + "  "
                    + resumen.cliente() + "  " + resumen.vendedor() + "  " + moneda(resumen.total())
                    + (resumen.anulada() ? "  ANULADA" : ""));
        }
        return pdf.construir();
    }

    private static void encabezado(PdfSimple pdf, DatosNegocio negocio) {
        pdf.linea(negocio.nombre());
        pdf.linea(negocio.direccion() + " - " + negocio.ciudad());
        pdf.linea("Tel: " + negocio.telefono() + "   NIT: " + negocio.identificacion());
    }

    private static String moneda(Dinero dinero) {
        return "$ " + String.format(COLOMBIA, "%,.2f", dinero.valor());
    }

    private static String texto(String valor) {
        return valor == null ? "" : valor;
    }
}
