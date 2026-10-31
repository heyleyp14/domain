package co.edu.unipamplona.ferreteria.application.port.in.command;

import java.util.List;

/** La fecha (AAAA-MM-DD) es opcional: si no llega, se usa la de hoy. */
public record RegistrarCompraCommand(Long proveedorId, String fecha, List<ItemCompraCommand> items) { }
