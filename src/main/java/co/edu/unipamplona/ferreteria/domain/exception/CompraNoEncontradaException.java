package co.edu.unipamplona.ferreteria.domain.exception;

public class CompraNoEncontradaException extends NoEncontradoException {
    public CompraNoEncontradaException(String codigo) {
        super("No existe la compra " + codigo);
    }
}
