package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import java.util.*;

public class ProveedorRepositoryEnMemoria implements ProveedorRepositoryPort {

    private final Map<Long, Proveedor> filas = new TreeMap<>();
    private long siguiente = 1;

    @Override
    public Proveedor guardar(Proveedor p) {
        long id = p.getId() == null ? siguiente++ : p.getId();
        filas.put(id, copia(id, p));
        return copia(id, p);
    }

    @Override
    public Optional<Proveedor> buscarPorId(long id) { return Optional.ofNullable(filas.get(id)).map(p -> copia(id, p)); }

    @Override
    public Optional<Proveedor> buscarPorNombre(String nombreNormalizado) {
        return filas.values().stream().filter(p -> Proveedor.normalizarNombre(p.getNombre()).equals(nombreNormalizado))
                .findFirst().map(p -> copia(p.getId(), p));
    }

    @Override
    public List<Proveedor> buscarPorIds(Collection<Long> ids) {
        List<Proveedor> r = new ArrayList<>();
        for (Long id : ids) if (filas.containsKey(id)) r.add(copia(id, filas.get(id)));
        r.sort(Comparator.comparing(p -> p.getNombre().toLowerCase(Locale.ROOT)));
        return r;
    }

    @Override
    public List<Proveedor> buscar(String texto) {
        List<Proveedor> r = new ArrayList<>();
        for (Proveedor p : filas.values()) {
            if (texto != null && !p.getNombre().toLowerCase(Locale.ROOT).contains(texto.toLowerCase(Locale.ROOT))) continue;
            r.add(copia(p.getId(), p));
        }
        r.sort(Comparator.comparing(p -> p.getNombre().toLowerCase(Locale.ROOT)));
        return r;
    }

    private Proveedor copia(long id, Proveedor p) {
        return Proveedor.reconstruir(id, p.getNombre(), p.getTelefono(), p.getCorreo(), p.getDireccion(), p.getAuditoria());
    }
}
