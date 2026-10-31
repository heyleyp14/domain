package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;

/** Una línea de compra: cuántas unidades de un producto se compraron y a qué precio unitario (sin IVA). */
public record LineaCompra(String codigoProducto, String nombreProducto, int cantidad, Dinero precioUnitario) {

    public static final int CANTIDAD_MAXIMA = 100_000;

    public LineaCompra {
        if (cantidad < 1 || cantidad > CANTIDAD_MAXIMA) {
            throw new ValorInvalidoException("La cantidad de " + codigoProducto + " debe estar entre 1 y " + CANTIDAD_MAXIMA);
        }
        if (precioUnitario == null || !precioUnitario.esMayorQueCero()) {
            throw new ValorInvalidoException("El precio de compra de " + codigoProducto + " debe ser mayor que cero");
        }
    }

    public Dinero total() { return precioUnitario.multiplicar(cantidad); }
}
