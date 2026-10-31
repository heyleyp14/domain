package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.FiltroCompras;
import co.edu.unipamplona.ferreteria.domain.exception.CompraNoEncontradaException;
import co.edu.unipamplona.ferreteria.domain.model.Compra;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.PrecioCompra;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.CompraEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.LineaCompraEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.CompraMapper;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.CompraJpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional(readOnly = true)
public class CompraRepositoryAdapter implements CompraRepositoryPort {

    private final CompraJpaRepository jpa;
    private final CompraMapper mapper;

    public CompraRepositoryAdapter(CompraJpaRepository jpa, CompraMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public Compra guardar(Compra c) {
        if (c.getId() == null) {
            return mapper.aDominio(jpa.save(mapper.aEntidad(c)));
        }
        CompraEntity e = jpa.findById(c.getId())
                .orElseThrow(() -> new CompraNoEncontradaException(Compra.codigoDe(c.getId())));
        mapper.actualizar(e, c);
        // La entidad está gestionada: el flush del commit aplica los cambios.
        return mapper.aDominio(e);
    }

    @Override
    public Optional<Compra> buscarPorId(long id) {
        return jpa.findById(id).map(mapper::aDominio);
    }

    @Override
    public List<Compra> buscar(FiltroCompras f) {
        return jpa.buscar(f.proveedorId(), f.desde(), f.hasta(), f.codigoProducto()).stream()
                .map(mapper::aDominio)
                .toList();
    }

    @Override
    public List<PrecioCompra> buscarPreciosPorProducto(String codigo) {
        return jpa.buscarLineasPorProducto(codigo).stream()
                .map(l -> new PrecioCompra(l.getCompra().getId(), l.getCompra().getProveedorId(),
                        l.getCompra().getFecha(), Dinero.de(l.getPrecioUnitario())))
                .toList();
    }
}
