package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.FiltroCompras;
import co.edu.unipamplona.ferreteria.domain.model.Compra;
import co.edu.unipamplona.ferreteria.domain.model.LineaCompra;
import co.edu.unipamplona.ferreteria.domain.model.PrecioCompra;
import java.util.*;

public class CompraRepositoryEnMemoria implements CompraRepositoryPort {

    private final Map<Long, Compra> filas = new TreeMap<>();
    private long siguiente = 1;

    @Override
    public Compra guardar(Compra c) {
        long id = c.getId() == null ? siguiente++ : c.getId();
        filas.put(id, copia(id, c));
        return copia(id, c);
    }

    @Override
    public Optional<Compra> buscarPorId(long id) { return Optional.ofNullable(filas.get(id)).map(c -> copia(id, c)); }

    @Override
    public List<Compra> buscar(FiltroCompras f) {
        List<Compra> r = new ArrayList<>();
        for (Compra c : filas.values()) {
            if (f.proveedorId() != null && c.getProveedorId() != f.proveedorId()) continue;
            if (f.desde() != null && c.getFecha().isBefore(f.desde())) continue;
            if (f.hasta() != null && c.getFecha().isAfter(f.hasta())) continue;
            if (f.codigoProducto() != null && c.getLineas().stream().noneMatch(l -> l.codigoProducto().equals(f.codigoProducto()))) continue;
            r.add(copia(c.getId(), c));
        }
        r.sort(Comparator.comparing(Compra::getFecha).thenComparing(Compra::getId).reversed());
        return r;
    }

    @Override
    public List<PrecioCompra> buscarPreciosPorProducto(String codigo) {
        List<PrecioCompra> r = new ArrayList<>();
        for (Compra c : filas.values()) {
            for (LineaCompra l : c.getLineas()) {
                if (l.codigoProducto().equals(codigo)) r.add(new PrecioCompra(c.getId(), c.getProveedorId(), c.getFecha(), l.precioUnitario()));
            }
        }
        return r;
    }

    private Compra copia(long id, Compra c) {
        return Compra.reconstruir(id, c.getProveedorId(), c.getFecha(), c.getRegistradaPor(), c.getRegistradaEn(), c.getLineas());
    }
}
