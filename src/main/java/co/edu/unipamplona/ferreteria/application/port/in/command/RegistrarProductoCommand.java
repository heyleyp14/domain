package co.edu.unipamplona.ferreteria.application.port.in.command;

import java.math.BigDecimal;

public record RegistrarProductoCommand(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva, Integer stockInicial,
                                       Long proveedorId) { }
