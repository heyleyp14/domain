package co.edu.unipamplona.ferreteria.domain.model;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Serie de ventas por día para la gráfica de Inicio. Incluye todos los días del rango, también los que no
 * tuvieron ventas (en cero), para que la línea sea continua y el eje no mienta saltándose fechas.
 */
public record TendenciaVentas(LocalDate desde, LocalDate hasta, List<VentaDiaria> dias) {

    public TendenciaVentas {
        dias = List.copyOf(dias);
    }

    public Dinero total() {
        Dinero suma = Dinero.CERO;
        for (VentaDiaria d : dias) {
            suma = suma.sumar(d.total());
        }
        return suma;
    }

    public int facturasEmitidas() {
        return dias.stream().mapToInt(VentaDiaria::facturasEmitidas).sum();
    }

    public int unidadesVendidas() {
        return dias.stream().mapToInt(VentaDiaria::unidadesVendidas).sum();
    }

    public boolean sinVentas() {
        return facturasEmitidas() == 0;
    }

    public long diasDelRango() {
        return ChronoUnit.DAYS.between(desde, hasta) + 1;
    }
}
