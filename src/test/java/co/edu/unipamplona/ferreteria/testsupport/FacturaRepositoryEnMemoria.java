package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import java.time.Instant;
import java.util.*;

public class FacturaRepositoryEnMemoria implements FacturaRepositoryPort {

    private final Map<Long, Factura> filas = new TreeMap<>();
    private long siguiente = 1;

    @Override
    public Factura guardar(Factura f) {
        long id = f.getId() == null ? siguiente++ : f.getId();
        filas.put(id, copia(id, f));
        return copia(id, f);
    }

    @Override
    public Optional<Factura> buscarPorNumero(String numero) {
        return filas.values().stream().filter(f -> f.getNumero().valor().equals(numero)).findFirst().map(f -> copia(f.getId(), f));
    }

    @Override
    public Optional<Factura> buscarPorNumeroBloqueando(String numero) { return buscarPorNumero(numero); }

    @Override
    public List<Factura> buscarEmitidasEntre(Instant desde, Instant hasta) {
        List<Factura> r = new ArrayList<>();
        for (Factura f : filas.values()) {
            if (!f.getFecha().isBefore(desde) && f.getFecha().isBefore(hasta)) r.add(copia(f.getId(), f));
        }
        r.sort(Comparator.comparing(Factura::getFecha).thenComparing(Factura::getId));
        return r;
    }

    private Factura copia(long id, Factura f) {
        return Factura.reconstruir(id, f.getNumero(), f.getFecha(), f.getClienteNombre(), f.getClienteDireccion(),
                f.getClienteTelefono(), f.getVendedor(), f.getLineas(), f.getEstado(), f.getAnuladaPor(), f.getAnuladaEn(),
                f.getMotivoAnulacion());
    }
}
