package co.edu.unipamplona.ferreteria.domain.exception;

public class ProveedorNoEncontradoException extends NoEncontradoException {
    public ProveedorNoEncontradoException(long id) {
        super("No existe el proveedor " + id);
    }
}
