package co.edu.unipamplona.ferreteria.domain.model;

import java.time.LocalDate;

/** Un punto de la tendencia: lo vendido en un día del calendario del negocio. Las anuladas no suman. */
public record VentaDiaria(LocalDate fecha, Dinero total, int facturasEmitidas, int unidadesVendidas) {

    public static VentaDiaria sinVentas(LocalDate fecha) {
        return new VentaDiaria(fecha, Dinero.CERO, 0, 0);
    }
}
