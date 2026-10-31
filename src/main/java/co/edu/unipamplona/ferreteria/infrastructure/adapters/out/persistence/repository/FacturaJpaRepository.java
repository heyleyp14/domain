package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository;

import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.FacturaEntity;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FacturaJpaRepository extends JpaRepository<FacturaEntity, Long> {

    Optional<FacturaEntity> findByNumero(String numero);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from FacturaEntity f where f.numero = :numero")
    Optional<FacturaEntity> buscarPorNumeroBloqueando(@Param("numero") String numero);

    @Query("select f from FacturaEntity f where f.fecha >= :desde and f.fecha < :hasta order by f.fecha, f.id")
    List<FacturaEntity> buscarEmitidasEntre(@Param("desde") Instant desde, @Param("hasta") Instant hasta);
}
