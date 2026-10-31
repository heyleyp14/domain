package co.edu.unipamplona.ferreteria.domain.exception;

/** Ya existe algo igual (409). */
public class DuplicadoException extends DominioException {
    public DuplicadoException(String mensaje) {
        super(mensaje);
    }
}
