package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.exception.FacturaNoEncontradaException;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.FacturaEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.FacturaMapper;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.FacturaJpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional(readOnly = true)
public class FacturaRepositoryAdapter implements FacturaRepositoryPort {

    private final FacturaJpaRepository jpa;
    private final FacturaMapper mapper;

    public FacturaRepositoryAdapter(FacturaJpaRepository jpa, FacturaMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public Factura guardar(Factura f) {
        if (f.getId() == null) {
            return mapper.aDominio(jpa.save(mapper.aEntidad(f)));
        }
        FacturaEntity e = jpa.findById(f.getId())
                .orElseThrow(() -> new FacturaNoEncontradaException(f.getNumero().valor()));
        mapper.actualizar(e, f);
        // La entidad está gestionada: el flush del commit aplica la anulación.
        return mapper.aDominio(e);
    }

    @Override
    public Optional<Factura> buscarPorNumero(String numero) {
        return jpa.findByNumero(numero).map(mapper::aDominio);
    }

    @Override
    @Transactional
    public Optional<Factura> buscarPorNumeroBloqueando(String numero) {
        return jpa.buscarPorNumeroBloqueando(numero).map(mapper::aDominio);
    }

    @Override
    public List<Factura> buscarEmitidasEntre(Instant desde, Instant hasta) {
        return jpa.buscarEmitidasEntre(desde, hasta).stream().map(mapper::aDominio).toList();
    }
}
