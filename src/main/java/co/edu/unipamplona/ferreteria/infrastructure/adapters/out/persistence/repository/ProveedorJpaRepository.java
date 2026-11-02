package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository;

import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.ProveedorEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProveedorJpaRepository extends JpaRepository<ProveedorEntity, Long> {

    Optional<ProveedorEntity> findByNombreNormalizado(String nombreNormalizado);

    @Query("select p from ProveedorEntity p where (:patron is null or p.nombreNormalizado like :patron) order by p.nombreNormalizado")
    List<ProveedorEntity> buscar(@Param("patron") String patron);

    @Query(value = "select p from ProveedorEntity p where (:patron is null or p.nombreNormalizado like :patron) order by p.nombreNormalizado",
            countQuery = "select count(p) from ProveedorEntity p where (:patron is null or p.nombreNormalizado like :patron)")
    Page<ProveedorEntity> buscar(@Param("patron") String patron, Pageable pageable);
}
