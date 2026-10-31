package co.edu.unipamplona.ferreteria.domain.model;

import java.time.LocalDate;
import java.util.List;

/** Resultado de comparar los precios de compra de un producto entre proveedores. */
public record ComparacionPrecios(String codigoProducto, String nombreProducto, List<Oferta> ofertas) {

    /**
     * Lo que ofrece un proveedor: su precio más reciente (el vigente), el menor que haya cobrado y cuántas compras hay.
     * {@code esMenor} marca al proveedor (o proveedores, si empatan) con el menor precio vigente.
     */
    public record Oferta(long proveedorId, String proveedorNombre, Dinero ultimoPrecio, LocalDate fechaUltimaCompra,
                         Dinero menorPrecioHistorico, int compras, boolean esMenor) { }

    public boolean hayCompras() { return !ofertas.isEmpty(); }

    /** El proveedor con el menor precio vigente (si empatan, el primero por nombre) o null si no hay compras. */
    public Oferta mejor() { return ofertas.isEmpty() ? null : ofertas.get(0); }
}
