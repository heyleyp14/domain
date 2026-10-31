package co.edu.unipamplona.ferreteria.domain.exception;

/** La operación choca con el estado actual del recurso (negocio inactivo, pago ya anulado, etc.) → 409. */
public class EstadoInvalidoException extends DominioException {
    public EstadoInvalidoException(String mensaje) {
        super(mensaje);
    }
}
