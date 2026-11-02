package co.edu.unipamplona.ferreteria.domain.service;

import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.TendenciaVentas;
import co.edu.unipamplona.ferreteria.domain.model.VentaDiaria;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Agrupa las facturas del rango por día del calendario del negocio (America/Bogota), no por día UTC. */
public class TendenciaVentasService {

    private static final class Acumulado {
        final LocalDate fecha;
        Dinero total = Dinero.CERO;
        int facturas;
        int unidades;

        Acumulado(LocalDate fecha) {
            this.fecha = fecha;
        }
    }

    public TendenciaVentas construir(LocalDate desde, LocalDate hasta, ZoneId zona, List<Factura> facturas) {
        Map<LocalDate, Acumulado> porDia = new LinkedHashMap<>();
        for (LocalDate dia = desde; !dia.isAfter(hasta); dia = dia.plusDays(1)) {
            porDia.put(dia, new Acumulado(dia));
        }
        for (Factura f : facturas) {
            if (f.estaAnulada()) {
                continue;
            }
            Acumulado a = porDia.get(f.getFecha().atZone(zona).toLocalDate());
            if (a == null) {
                continue;
            }
            a.facturas++;
            a.total = a.total.sumar(f.total());
            for (LineaFactura l : f.getLineas()) {
                a.unidades += l.cantidad();
            }
        }
        List<VentaDiaria> dias = new ArrayList<>(porDia.size());
        for (Acumulado a : porDia.values()) {
            dias.add(new VentaDiaria(a.fecha, a.total, a.facturas, a.unidades));
        }
        return new TendenciaVentas(desde, hasta, dias);
    }
}
