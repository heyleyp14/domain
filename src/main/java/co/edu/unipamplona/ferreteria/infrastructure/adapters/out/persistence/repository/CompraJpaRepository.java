package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository;

import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.CompraEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.LineaCompraEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompraJpaRepository extends JpaRepository<CompraEntity, Long> {

    @Query("""
            select c from CompraEntity c
            where (:proveedorId is null or c.proveedorId = :proveedorId)
              and (:desde is null or c.fecha >= :desde)
              and (:hasta is null or c.fecha <= :hasta)
              and (:codigo is null or exists (
                    select 1 from LineaCompraEntity l where l.compra = c and l.codigoProducto = :codigo))
            order by c.fecha desc, c.id desc
            """)
    List<CompraEntity> buscar(@Param("proveedorId") Long proveedorId,
                              @Param("desde") LocalDate desde,
                              @Param("hasta") LocalDate hasta,
                              @Param("codigo") String codigo);

    @Query(value = """
            select c from CompraEntity c
            where (:proveedorId is null or c.proveedorId = :proveedorId)
              and (:desde is null or c.fecha >= :desde)
              and (:hasta is null or c.fecha <= :hasta)
              and (:codigo is null or exists (
                    select 1 from LineaCompraEntity l where l.compra = c and l.codigoProducto = :codigo))
            order by c.fecha desc, c.id desc
            """,
            countQuery = """
            select count(c) from CompraEntity c
            where (:proveedorId is null or c.proveedorId = :proveedorId)
              and (:desde is null or c.fecha >= :desde)
              and (:hasta is null or c.fecha <= :hasta)
              and (:codigo is null or exists (
                    select 1 from LineaCompraEntity l where l.compra = c and l.codigoProducto = :codigo))
            """)
    Page<CompraEntity> buscar(@Param("proveedorId") Long proveedorId,
                              @Param("desde") LocalDate desde,
                              @Param("hasta") LocalDate hasta,
                              @Param("codigo") String codigo,
                              Pageable pageable);

    @Query("select l from LineaCompraEntity l join fetch l.compra c where l.codigoProducto = :codigo order by c.fecha, c.id")
    List<LineaCompraEntity> buscarLineasPorProducto(@Param("codigo") String codigo);
}
