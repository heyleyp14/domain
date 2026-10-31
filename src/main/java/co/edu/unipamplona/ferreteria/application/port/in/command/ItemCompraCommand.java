package co.edu.unipamplona.ferreteria.application.port.in.command;

import java.math.BigDecimal;

public record ItemCompraCommand(String codigo, Integer cantidad, BigDecimal precioCompra) { }
