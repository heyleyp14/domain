package co.edu.unipamplona.ferreteria.domain.exception;

/** No existe lo que se pidió (404). */
public class NoEncontradoException extends DominioException {
    public NoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
