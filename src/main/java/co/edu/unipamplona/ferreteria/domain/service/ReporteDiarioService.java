package co.edu.unipamplona.ferreteria.domain.service;

import co.edu.unipamplona.ferreteria.domain.model.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Arma el cierre diario a partir de las facturas del día. Las anuladas se listan marcadas pero no suman.
 * Orden de los productos: más unidades, luego mayor valor, luego código.
 */
public class ReporteDiarioService {

    private static final class Acumulado {
        final String codigo;
        final String nombre;
        int cantidad;
        Dinero subtotal = Dinero.CERO;
        Dinero iva = Dinero.CERO;

        Acumulado(String codigo, String nombre) {
            this.codigo = codigo;
            this.nombre = nombre;
        }
    }

    public ReporteDiario construir(LocalDate fecha, List<Factura> facturasDelDia) {
        Map<String, Acumulado> productos = new LinkedHashMap<>();
        List<ResumenFactura> resumen = new ArrayList<>();
        int vigentes = 0;
        int anuladas = 0;
        int unidades = 0;
        Dinero subtotal = Dinero.CERO;
        Dinero iva = Dinero.CERO;
        for (Factura f : facturasDelDia) {
            resumen.add(new ResumenFactura(f.getNumero().valor(), f.getFecha(), f.getClienteNombre(), f.getVendedor(), f.total(),
                    f.estaAnulada()));
            if (f.estaAnulada()) {
                anuladas++;
                continue;
            }
            vigentes++;
            for (LineaFactura l : f.getLineas()) {
                Acumulado a = productos.computeIfAbsent(l.codigoProducto(), c -> new Acumulado(c, l.nombreProducto()));
                a.cantidad += l.cantidad();
                a.subtotal = a.subtotal.sumar(l.subtotal());
                a.iva = a.iva.sumar(l.iva());
                unidades += l.cantidad();
                subtotal = subtotal.sumar(l.subtotal());
                iva = iva.sumar(l.iva());
            }
        }
        List<LineaReporte> lineas = new ArrayList<>();
        for (Acumulado a : productos.values()) {
            lineas.add(new LineaReporte(a.codigo, a.nombre, a.cantidad, a.subtotal, a.iva, a.subtotal.sumar(a.iva)));
        }
        lineas.sort(Comparator.comparingInt(LineaReporte::cantidad).reversed()
                .thenComparing(Comparator.comparing(LineaReporte::total).reversed())
                .thenComparing(LineaReporte::codigoProducto));
        return new ReporteDiario(fecha, vigentes, anuladas, unidades, subtotal, iva, subtotal.sumar(iva), lineas, resumen);
    }
}
