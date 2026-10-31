package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.in.command.EmitirFacturaCommand;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.Factura;

/** Vender: emitir la factura (con descuento de stock, todo o nada), consultarla, anularla y descargarla en PDF. */
public interface VentaUseCase {

    Factura emitir(Actor actor, EmitirFacturaCommand comando);

    Factura consultar(Actor actor, String numero);

    /** Solo el ADMIN. Devuelve el stock de cada producto y deja la factura ANULADA. */
    Factura anular(Actor actor, String numero, String motivo);

    DocumentoPdf pdf(Actor actor, String numero);
}
