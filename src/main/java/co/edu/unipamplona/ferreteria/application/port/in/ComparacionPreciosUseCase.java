package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios;

public interface ComparacionPreciosUseCase {

    /** Solo el ADMIN. Compara el precio vigente de cada proveedor de un producto. */
    ComparacionPrecios comparar(Actor actor, String codigoProducto);

    /** Igual que {@link #comparar(Actor, String)}, con una página de ofertas. */
    ComparacionPreciosPaginada comparar(Actor actor, String codigoProducto, Paginacion paginacion);
}
