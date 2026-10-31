package co.edu.unipamplona.ferreteria.domain.exception;

public class FacturaNoEncontradaException extends NoEncontradoException {
    public FacturaNoEncontradaException(String numero) {
        super("No existe la factura " + numero);
    }
}
