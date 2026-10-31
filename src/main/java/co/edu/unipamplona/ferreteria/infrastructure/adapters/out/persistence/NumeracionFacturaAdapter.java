package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.NumeracionFacturaPort;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.NumeracionFacturaEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.NumeracionFacturaJpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Numeración consecutiva por año. Corre dentro de la transacción de la venta: si la
 * venta se revierte, el consecutivo también, así que no se consumen números.
 */
@Component
@Transactional
public class NumeracionFacturaAdapter implements NumeracionFacturaPort {

    private final NumeracionFacturaJpaRepository jpa;

    public NumeracionFacturaAdapter(NumeracionFacturaJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public long siguienteSecuencia(int anio) {
        return jpa.buscarPorAnioBloqueando(anio)
                .map(NumeracionFacturaEntity::incrementar)
                .orElseGet(() -> jpa.save(new NumeracionFacturaEntity(anio, 1L)).getUltimo());
    }
}
