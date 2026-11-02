package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.domain.model.LineaReporte;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.ResumenFactura;

/** Cierre diario con una página independiente para productos vendidos y facturas del día. */
public record ReporteDiarioPaginado(ReporteDiario reporte, Pagina<LineaReporte> productos,
                                    Pagina<ResumenFactura> facturas) { }
