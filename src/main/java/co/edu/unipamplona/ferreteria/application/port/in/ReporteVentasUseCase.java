package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.TendenciaVentas;

public interface ReporteVentasUseCase {

    /** Solo el ADMIN. La fecha se escribe AAAA-MM-DD. */
    ReporteDiario diario(Actor actor, String fecha);

    /** Igual que {@link #diario(Actor, String)}, con páginas independientes para productos y facturas. */
    ReporteDiarioPaginado diario(Actor actor, String fecha, Paginacion productos, Paginacion facturas);

    DocumentoPdf pdf(Actor actor, String fecha);

    /** Ventas por día de los últimos {@code dias} días (1 a 90), terminando hoy en hora de Bogotá. */
    TendenciaVentas tendencia(Actor actor, int dias);
}
