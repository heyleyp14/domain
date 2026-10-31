package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.exception.ProveedorNoEncontradoException;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.ProveedorEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.ProveedorMapper;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.ProveedorJpaRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional(readOnly = true)
public class ProveedorRepositoryAdapter implements ProveedorRepositoryPort {

    private final ProveedorJpaRepository jpa;
    private final ProveedorMapper mapper;

    public ProveedorRepositoryAdapter(ProveedorJpaRepository jpa, ProveedorMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public Proveedor guardar(Proveedor p) {
        if (p.getId() == null) {
            return mapper.aDominio(jpa.save(mapper.aEntidad(p)));
        }
        ProveedorEntity e = jpa.findById(p.getId())
                .orElseThrow(() -> new ProveedorNoEncontradoException(p.getId()));
        mapper.actualizar(e, p);
        // La entidad está gestionada: el flush del commit aplica los cambios.
        return mapper.aDominio(e);
    }

    @Override
    public Optional<Proveedor> buscarPorId(long id) {
        return jpa.findById(id).map(mapper::aDominio);
    }

    @Override
    public Optional<Proveedor> buscarPorNombre(String nombreNormalizado) {
        return jpa.findByNombreNormalizado(nombreNormalizado).map(mapper::aDominio);
    }

    @Override
    public List<Proveedor> buscarPorIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpa.findAllById(ids).stream()
                .sorted(Comparator.comparing(p -> p.getNombre().toLowerCase(Locale.ROOT)))
                .map(mapper::aDominio)
                .toList();
    }

    @Override
    public List<Proveedor> buscar(String texto) {
        String patron = texto == null ? null : "%" + Proveedor.normalizarNombre(texto) + "%";
        return jpa.buscar(patron).stream().map(mapper::aDominio).toList();
    }
}
