package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.in.command.ConsultarComprasQuery;
import co.edu.unipamplona.ferreteria.application.port.in.command.RegistrarCompraCommand;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import java.util.List;

/** Compras a proveedores: solo del ADMIN. Al confirmar, el stock de cada producto aumenta. */
public interface CompraUseCase {

    CompraDetalle registrar(Actor actor, RegistrarCompraCommand comando);

    CompraDetalle consultar(Actor actor, String codigo);

    List<CompraDetalle> listar(Actor actor, ConsultarComprasQuery consulta);
}
