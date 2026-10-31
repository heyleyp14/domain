package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository;

import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.ProductoEntity;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductoJpaRepository extends JpaRepository<ProductoEntity, Long> {

    Optional<ProductoEntity> findByCodigo(String codigo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ProductoEntity p where p.codigo in :codigos order by p.codigo")
    List<ProductoEntity> buscarPorCodigosBloqueando(@Param("codigos") Collection<String> codigos);

    @Query("""
            select p from ProductoEntity p
            where (:soloActivos = false or p.activo = true)
              and (:bajoStock = false or p.stock <= :umbral)
              and (:patron is null
                   or lower(p.codigo) like :patron
                   or lower(p.nombre) like :patron
                   or p.proveedorId in :proveedores)
            order by lower(p.nombre), p.codigo
            """)
    List<ProductoEntity> buscar(@Param("patron") String patron,
                                @Param("soloActivos") boolean soloActivos,
                                @Param("bajoStock") boolean bajoStock,
                                @Param("umbral") int umbral,
                                @Param("proveedores") Collection<Long> proveedores);

    @Query("select p from ProductoEntity p where p.proveedorId = :proveedorId order by lower(p.nombre), p.codigo")
    List<ProductoEntity> buscarPorProveedor(@Param("proveedorId") long proveedorId);
}
