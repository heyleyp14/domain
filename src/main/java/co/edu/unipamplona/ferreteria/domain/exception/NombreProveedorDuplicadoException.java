package co.edu.unipamplona.ferreteria.domain.exception;

public class NombreProveedorDuplicadoException extends DuplicadoException {
    public NombreProveedorDuplicadoException(String nombre) {
        super("Ya existe un proveedor con el nombre «" + nombre + "»");
    }
}
