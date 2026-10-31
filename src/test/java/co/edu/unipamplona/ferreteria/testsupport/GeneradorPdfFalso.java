package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import java.nio.charset.StandardCharsets;

/** Doble del generador de PDF: sirve para probar QUÉ se pide imprimir sin depender de cómo se dibuja. */
public class GeneradorPdfFalso implements GeneradorPdfPort {

    @Override
    public byte[] factura(Factura factura, DatosNegocio negocio) {
        return ("FACTURA " + factura.getNumero() + " " + negocio.nombre()).getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public byte[] reporteDiario(ReporteDiario reporte, DatosNegocio negocio) {
        return ("REPORTE " + reporte.fecha() + " " + negocio.nombre()).getBytes(StandardCharsets.UTF_8);
    }
}
