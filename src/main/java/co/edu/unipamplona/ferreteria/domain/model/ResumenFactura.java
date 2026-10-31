package co.edu.unipamplona.ferreteria.domain.model;

import java.time.Instant;

/** Una factura del día dentro del reporte (las anuladas aparecen marcadas, pero no suman). */
public record ResumenFactura(String numero, Instant fecha, String cliente, String vendedor, Dinero total, boolean anulada) { }
