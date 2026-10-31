package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;

/**
 * Una línea de la factura. El nombre y el precio del producto se «congelan» en el momento de la venta: si el producto
 * cambia después, la factura ya emitida no se altera. Subtotal, IVA y total se calculan con decimales exactos.
 */
public record LineaFactura(String codigoProducto, String nombreProducto, int cantidad, Dinero precioBase, boolean aplicaIva) {

    public static final int CANTIDAD_MAXIMA = 100_000;

    public LineaFactura {
        if (cantidad < 1 || cantidad > CANTIDAD_MAXIMA) {
            throw new ValorInvalidoException("La cantidad de " + codigoProducto + " debe estar entre 1 y " + CANTIDAD_MAXIMA);
        }
    }

    public static LineaFactura de(Producto p, int cantidad) {
        return new LineaFactura(p.getCodigo(), p.getNombre(), cantidad, p.getPrecioBase(), p.isAplicaIva());
    }

    /** Cantidad por precio base, sin IVA. */
    public Dinero subtotal() { return precioBase.multiplicar(cantidad); }

    public Dinero iva() { return aplicaIva ? Iva.sobre(subtotal()) : Dinero.CERO; }

    public Dinero total() { return subtotal().sumar(iva()); }
}
