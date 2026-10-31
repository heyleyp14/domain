package co.edu.unipamplona.ferreteria.domain.exception;

/** Un dato no cumple una regla del dominio (formato, rango, campo obligatorio). */
public class ValorInvalidoException extends DominioException {

    public ValorInvalidoException(String mensaje) {
        super(mensaje);
    }
}
