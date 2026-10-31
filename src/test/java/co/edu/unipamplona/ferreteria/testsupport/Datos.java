package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.domain.model.*;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/** Datos de ejemplo. El reloj fijo es martes 20 de octubre de 2026, 10:00 en Bogotá. */
public final class Datos {

    public static final Instant AHORA = Instant.parse("2026-10-20T15:00:00Z");
    public static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    public static final LocalDate HOY = LocalDate.of(2026, 10, 20);
    public static final DatosNegocio NEGOCIO = new DatosNegocio("Ferretería Ambiente Murano 3D", "Cúcuta", "Calle 10 # 5-20",
            "3000000000", "900000000-1");

    private Datos() { }

    public static Clock relojFijo() { return Clock.fixed(AHORA, BOGOTA); }

    public static RelojAjustable relojAjustable() { return new RelojAjustable(AHORA, BOGOTA); }

    public static Actor admin() { return Actor.de("admin@murano3d.co", List.of("ADMIN")); }

    public static Actor vendedor(String usuario) { return Actor.de(usuario, List.of("USER")); }

    public static Proveedor proveedor(String nombre) {
        return Proveedor.registrar(nombre, "3001234567", "ventas@proveedor.co", "Calle 5 # 3-10", "admin", AHORA);
    }

    public static Proveedor proveedorConId(long id, String nombre) {
        Proveedor p = proveedor(nombre);
        return Proveedor.reconstruir(id, p.getNombre(), p.getTelefono(), p.getCorreo(), p.getDireccion(), p.getAuditoria());
    }

    public static Producto producto(String codigo, String precio, boolean iva, int stock, long proveedorId) {
        return Producto.registrar(codigo, "Producto " + codigo, new BigDecimal(precio), iva, stock, proveedorId, "admin", AHORA);
    }

    public static Producto productoConId(long id, String codigo, String precio, boolean iva, int stock, long proveedorId) {
        Producto p = producto(codigo, precio, iva, stock, proveedorId);
        return Producto.reconstruir(id, p.getCodigo(), p.getNombre(), p.getPrecioBase(), p.isAplicaIva(), p.getStock(),
                p.getProveedorId(), p.isActivo(), p.getAuditoria());
    }

    public static Factura factura(String numero, Instant fecha, String cliente, boolean anulada, LineaFactura... lineas) {
        Factura f = Factura.emitir(NumeroFactura.desde(numero), cliente, "Calle 1 # 2-3", "3101234567", "vendedor1",
                List.of(lineas), fecha);
        if (anulada) f.anular("Error en el pedido", "admin", fecha.plusSeconds(60));
        return f;
    }

    public static LineaFactura linea(String codigo, int cantidad, String precio, boolean iva) {
        return new LineaFactura(codigo, "Producto " + codigo, cantidad, Dinero.de(precio), iva);
    }
}
