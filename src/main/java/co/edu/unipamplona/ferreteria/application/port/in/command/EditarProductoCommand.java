package co.edu.unipamplona.ferreteria.application.port.in.command;

import java.math.BigDecimal;

/** El código identifica al producto y no cambia; el stock tampoco se edita aquí (solo cambia por ventas, compras y anulaciones). */
public record EditarProductoCommand(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva, Long proveedorId) { }
