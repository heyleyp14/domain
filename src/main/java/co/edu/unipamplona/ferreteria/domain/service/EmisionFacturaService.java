package co.edu.unipamplona.ferreteria.domain.service;

import co.edu.unipamplona.ferreteria.domain.exception.StockInsuficienteException;
import co.edu.unipamplona.ferreteria.domain.exception.StockInsuficienteException.Faltante;
import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import co.edu.unipamplona.ferreteria.domain.model.ItemVenta;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Regla que involucra varios productos a la vez, por eso es un servicio de dominio y no vive en ninguno de ellos:
 * revisar que TODA la venta se pueda cumplir antes de tocar el inventario.
 */
public class EmisionFacturaService {

    /** Suma las cantidades de un producto repetido en varias líneas, conservando el orden en que llegaron. */
    public List<ItemVenta> consolidar(List<ItemVenta> items) {
        if (items == null || items.isEmpty()) {
            throw new ValorInvalidoException("La venta necesita al menos un producto");
        }
        Map<String, Integer> sumas = new LinkedHashMap<>();
        for (ItemVenta i : items) {
            if (i.cantidad() < 1 || i.cantidad() > LineaFactura.CANTIDAD_MAXIMA) {
                throw new ValorInvalidoException("La cantidad de " + i.codigo() + " debe estar entre 1 y " + LineaFactura.CANTIDAD_MAXIMA);
            }
            sumas.merge(i.codigo(), i.cantidad(), Integer::sum);
        }
        List<ItemVenta> r = new ArrayList<>();
        sumas.forEach((codigo, cantidad) -> r.add(new ItemVenta(codigo, cantidad)));
        return r;
    }

    /**
     * Revisa que cada producto esté activo y alcance, y arma las líneas con nombre y precio congelados. Si faltan
     * existencias informa todos los productos que no alcanzan, no solo el primero. No modifica ningún producto.
     */
    public List<LineaFactura> prepararLineas(List<ItemVenta> consolidados, Map<String, Producto> productos) {
        List<Faltante> faltantes = new ArrayList<>();
        for (ItemVenta i : consolidados) {
            Producto p = productos.get(i.codigo());
            p.asegurarVendible();
            if (!p.alcanza(i.cantidad())) {
                faltantes.add(new Faltante(p.getCodigo(), p.getNombre(), p.getStock(), i.cantidad()));
            }
        }
        if (!faltantes.isEmpty()) {
            throw new StockInsuficienteException(faltantes);
        }
        List<LineaFactura> lineas = new ArrayList<>();
        for (ItemVenta i : consolidados) {
            lineas.add(LineaFactura.de(productos.get(i.codigo()), i.cantidad()));
        }
        return lineas;
    }
}
