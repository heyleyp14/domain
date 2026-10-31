package co.edu.unipamplona.ferreteria.domain.service;

import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios;
import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios.Oferta;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.PrecioCompra;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Compara a los proveedores de un producto. Regla: se compara el precio MÁS RECIENTE de cada proveedor (su oferta
 * vigente), porque un precio de hace dos años ya no es una oferta; además se muestra el menor que haya cobrado.
 * Orden: menor precio vigente primero; si empatan, por nombre.
 */
public class ComparadorPrecios {

    public ComparacionPrecios comparar(String codigo, String nombre, List<PrecioCompra> precios, Map<Long, String> nombresProveedor) {
        Map<Long, List<PrecioCompra>> porProveedor = new LinkedHashMap<>();
        for (PrecioCompra p : precios) {
            porProveedor.computeIfAbsent(p.proveedorId(), k -> new ArrayList<>()).add(p);
        }
        List<Oferta> ofertas = new ArrayList<>();
        for (Map.Entry<Long, List<PrecioCompra>> e : porProveedor.entrySet()) {
            PrecioCompra ultimo = e.getValue().stream()
                    .max(Comparator.comparing(PrecioCompra::fecha).thenComparingLong(PrecioCompra::compraId)).orElseThrow();
            Dinero menor = e.getValue().stream().map(PrecioCompra::precioUnitario).min(Dinero::compareTo).orElseThrow();
            ofertas.add(new Oferta(e.getKey(), nombresProveedor.getOrDefault(e.getKey(), "Proveedor " + e.getKey()),
                    ultimo.precioUnitario(), ultimo.fecha(), menor, e.getValue().size(), false));
        }
        ofertas.sort(Comparator.comparing(Oferta::ultimoPrecio)
                .thenComparing(o -> o.proveedorNombre().toLowerCase(Locale.ROOT)));
        if (ofertas.isEmpty()) return new ComparacionPrecios(codigo, nombre, List.of());
        Dinero minimo = ofertas.get(0).ultimoPrecio();
        List<Oferta> marcadas = new ArrayList<>();
        for (Oferta o : ofertas) {
            marcadas.add(new Oferta(o.proveedorId(), o.proveedorNombre(), o.ultimoPrecio(), o.fechaUltimaCompra(),
                    o.menorPrecioHistorico(), o.compras(), o.ultimoPrecio().compareTo(minimo) == 0));
        }
        return new ComparacionPrecios(codigo, nombre, marcadas);
    }
}
