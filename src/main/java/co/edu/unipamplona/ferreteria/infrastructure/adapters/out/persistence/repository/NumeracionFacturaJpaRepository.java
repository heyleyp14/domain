package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository;

import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.NumeracionFacturaEntity;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NumeracionFacturaJpaRepository extends JpaRepository<NumeracionFacturaEntity, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from NumeracionFacturaEntity n where n.anio = :anio")
    Optional<NumeracionFacturaEntity> buscarPorAnioBloqueando(@Param("anio") int anio);
}
