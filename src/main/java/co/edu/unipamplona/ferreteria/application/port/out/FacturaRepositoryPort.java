package co.edu.unipamplona.ferreteria.application.port.out;

import co.edu.unipamplona.ferreteria.domain.model.Factura;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Puerto de salida de facturas (raíz de agregado con sus líneas). */
public interface FacturaRepositoryPort {

    Factura guardar(Factura factura);

    Optional<Factura> buscarPorNumero(String numero);

    /** Bloquea la factura (SELECT … FOR UPDATE) para que no se anule dos veces a la vez. */
    Optional<Factura> buscarPorNumeroBloqueando(String numero);

    /** Facturas con fecha en el intervalo semiabierto [desde, hasta), ordenadas por fecha. */
    List<Factura> buscarEmitidasEntre(Instant desde, Instant hasta);
}
