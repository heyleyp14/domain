package co.edu.unipamplona.ferreteria.domain.exception;

public class CodigoProductoDuplicadoException extends DuplicadoException {
    public CodigoProductoDuplicadoException(String codigo) {
        super("Ya existe un producto con el código «" + codigo + "»");
    }
}
