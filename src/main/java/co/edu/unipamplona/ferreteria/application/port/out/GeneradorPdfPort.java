package co.edu.unipamplona.ferreteria.application.port.out;

import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;

/** Puerto de salida para generar documentos PDF (factura y reporte diario). */
public interface GeneradorPdfPort {

    byte[] factura(Factura factura, DatosNegocio negocio);

    byte[] reporteDiario(ReporteDiario reporte, DatosNegocio negocio);
}
