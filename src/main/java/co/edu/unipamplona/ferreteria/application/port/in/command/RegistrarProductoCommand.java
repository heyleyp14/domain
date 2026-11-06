package co.edu.unipamplona.ferreteria.application.port.in.command;

import java.math.BigDecimal;

public record RegistrarProductoCommand(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva,
                                       Integer stockInicial, Long proveedorId, String unidadMedida) {

    public RegistrarProductoCommand(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva,
                                    Integer stockInicial, Long proveedorId) {
        this(codigo, nombre, precioBase, aplicaIva, stockInicial, proveedorId, null);
    }
}
