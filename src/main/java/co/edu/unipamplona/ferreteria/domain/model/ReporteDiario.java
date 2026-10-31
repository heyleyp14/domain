package co.edu.unipamplona.ferreteria.domain.model;

import java.time.LocalDate;
import java.util.List;

/** Cierre diario de ventas: qué se vendió en la fecha, cuánto y quién lo vendió. */
public record ReporteDiario(LocalDate fecha, int facturasEmitidas, int facturasAnuladas, int unidadesVendidas,
                            Dinero subtotal, Dinero iva, Dinero total, List<LineaReporte> productos, List<ResumenFactura> facturas) {

    /** Sin facturas vigentes ese día. El reporte lo dice explícitamente en vez de fallar. */
    public boolean sinVentas() { return facturasEmitidas == 0; }
}
