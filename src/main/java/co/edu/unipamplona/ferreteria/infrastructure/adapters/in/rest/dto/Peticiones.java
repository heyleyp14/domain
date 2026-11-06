package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto;

import java.math.BigDecimal;
import java.util.List;

/** Cuerpos JSON que recibe la API. Las reglas de validación viven en el dominio, no aquí. */
public final class Peticiones {

    private Peticiones() { }

    public record Proveedor(String nombre, String telefono, String correo, String direccion) { }

    public record ProductoNuevo(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva, Integer stockInicial,
                                Long proveedorId, String unidadMedida) { }

    public record ProductoEdicion(String nombre, BigDecimal precioBase, Boolean aplicaIva, Long proveedorId,
                                  String unidadMedida) { }

    public record ItemVenta(String codigo, Integer cantidad) { }

    public record Factura(String clienteNombre, String clienteDireccion, String clienteTelefono, List<ItemVenta> items) { }

    public record Anulacion(String motivo) { }

    public record ItemCompra(String codigo, Integer cantidad, BigDecimal precioCompra) { }

    public record Compra(Long proveedorId, String fecha, List<ItemCompra> items) { }
}
