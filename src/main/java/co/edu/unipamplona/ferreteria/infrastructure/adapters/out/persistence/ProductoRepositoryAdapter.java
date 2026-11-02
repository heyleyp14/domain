package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.FiltroProductos;
import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.exception.ProductoNoEncontradoException;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.ProductoEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.ProductoMapper;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.ProductoJpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional(readOnly = true)
public class ProductoRepositoryAdapter implements ProductoRepositoryPort {

    private final ProductoJpaRepository jpa;
    private final ProductoMapper mapper;

    public ProductoRepositoryAdapter(ProductoJpaRepository jpa, ProductoMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public Producto guardar(Producto p) {
        if (p.getId() == null) {
            return mapper.aDominio(jpa.save(mapper.aEntidad(p)));
        }
        ProductoEntity e = jpa.findById(p.getId())
                .orElseThrow(() -> new ProductoNoEncontradoException(p.getCodigo()));
        mapper.actualizar(e, p);
        // La entidad está gestionada: el flush del commit aplica los cambios y conserva @Version.
        return mapper.aDominio(e);
    }

    @Override
    public Optional<Producto> buscarPorCodigo(String codigo) {
        return jpa.findByCodigo(codigo).map(mapper::aDominio);
    }

    @Override
    @Transactional
    public List<Producto> buscarPorCodigosBloqueando(Collection<String> codigos) {
        if (codigos == null || codigos.isEmpty()) {
            return List.of();
        }
        return jpa.buscarPorCodigosBloqueando(codigos).stream().map(mapper::aDominio).toList();
    }

    @Override
    public List<Producto> buscar(FiltroProductos f) {
        return jpa.buscar(patron(f), f.soloActivos(), f.bajoStock(), Producto.UMBRAL_STOCK_BAJO, proveedores(f)).stream()
                .map(mapper::aDominio)
                .toList();
    }

    @Override
    public Pagina<Producto> buscar(FiltroProductos f, Paginacion paginacion) {
        Page<ProductoEntity> page = jpa.buscar(patron(f), f.soloActivos(), f.bajoStock(), Producto.UMBRAL_STOCK_BAJO,
                proveedores(f), PageRequest.of(paginacion.pagina() - 1, paginacion.tamano()));
        return new Pagina<>(page.getContent().stream().map(mapper::aDominio).toList(), page.getTotalElements(),
                paginacion.pagina(), paginacion.tamano());
    }

    @Override
    public List<Producto> buscarPorProveedor(long proveedorId) {
        return jpa.buscarPorProveedor(proveedorId).stream().map(mapper::aDominio).toList();
    }

    @Override
    public Pagina<Producto> buscarPorProveedor(long proveedorId, Paginacion paginacion) {
        Page<ProductoEntity> page = jpa.buscarPorProveedor(proveedorId,
                PageRequest.of(paginacion.pagina() - 1, paginacion.tamano()));
        return new Pagina<>(page.getContent().stream().map(mapper::aDominio).toList(), page.getTotalElements(),
                paginacion.pagina(), paginacion.tamano());
    }

    private String patron(FiltroProductos f) {
        return f.texto() == null ? null : "%" + f.texto().toLowerCase(Locale.ROOT) + "%";
    }

    private Set<Long> proveedores(FiltroProductos f) {
        return (f.proveedoresCoincidentes() == null || f.proveedoresCoincidentes().isEmpty())
                ? Set.of(-1L)
                : f.proveedoresCoincidentes();
    }
}
