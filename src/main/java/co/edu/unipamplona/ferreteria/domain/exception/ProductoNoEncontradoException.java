package co.edu.unipamplona.ferreteria.domain.exception;

import java.util.List;

public class ProductoNoEncontradoException extends NoEncontradoException {
    public ProductoNoEncontradoException(String codigo) {
        super("No existe el producto " + codigo);
    }

    public ProductoNoEncontradoException(List<String> codigos) {
        super("No existen los productos: " + String.join(", ", codigos));
    }
}
