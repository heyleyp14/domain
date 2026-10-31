package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.FiltroProductos;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import java.util.*;

public class ProductoRepositoryEnMemoria implements ProductoRepositoryPort {

    private final Map<Long, Producto> filas = new TreeMap<>();
    private long siguiente = 1;

    @Override
    public Producto guardar(Producto p) {
        long id = p.getId() == null ? siguiente++ : p.getId();
        filas.put(id, copia(id, p));
        return copia(id, p);
    }

    @Override
    public Optional<Producto> buscarPorCodigo(String codigo) {
        return filas.values().stream().filter(p -> p.getCodigo().equals(codigo)).findFirst().map(p -> copia(p.getId(), p));
    }

    @Override
    public List<Producto> buscarPorCodigosBloqueando(Collection<String> codigos) {
        List<Producto> r = new ArrayList<>();
        for (Producto p : filas.values()) if (codigos.contains(p.getCodigo())) r.add(copia(p.getId(), p));
        r.sort(Comparator.comparing(Producto::getCodigo));
        return r;
    }

    @Override
    public List<Producto> buscar(FiltroProductos f) {
        List<Producto> r = new ArrayList<>();
        for (Producto p : filas.values()) {
            if (f.soloActivos() && !p.isActivo()) continue;
            if (f.bajoStock() && !p.stockBajo()) continue;
            if (f.texto() != null) {
                String t = f.texto().toLowerCase(Locale.ROOT);
                boolean coincide = p.getCodigo().toLowerCase(Locale.ROOT).contains(t) || p.getNombre().toLowerCase(Locale.ROOT).contains(t)
                        || f.proveedoresCoincidentes().contains(p.getProveedorId());
                if (!coincide) continue;
            }
            r.add(copia(p.getId(), p));
        }
        r.sort(Comparator.comparing((Producto p) -> p.getNombre().toLowerCase(Locale.ROOT)).thenComparing(Producto::getCodigo));
        return r;
    }

    @Override
    public List<Producto> buscarPorProveedor(long proveedorId) {
        List<Producto> r = new ArrayList<>();
        for (Producto p : filas.values()) if (p.getProveedorId() == proveedorId) r.add(copia(p.getId(), p));
        r.sort(Comparator.comparing((Producto p) -> p.getNombre().toLowerCase(Locale.ROOT)).thenComparing(Producto::getCodigo));
        return r;
    }

    private Producto copia(long id, Producto p) {
        return Producto.reconstruir(id, p.getCodigo(), p.getNombre(), p.getPrecioBase(), p.isAplicaIva(), p.getStock(),
                p.getProveedorId(), p.isActivo(), p.getAuditoria());
    }
}
