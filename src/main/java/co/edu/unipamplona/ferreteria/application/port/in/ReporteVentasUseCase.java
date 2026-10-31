package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;

public interface ReporteVentasUseCase {

    /** Solo el ADMIN. La fecha se escribe AAAA-MM-DD. */
    ReporteDiario diario(Actor actor, String fecha);

    DocumentoPdf pdf(Actor actor, String fecha);
}
