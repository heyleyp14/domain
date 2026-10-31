package co.edu.unipamplona.ferreteria.application.port.in.command;

import java.util.List;

public record EmitirFacturaCommand(String clienteNombre, String clienteDireccion, String clienteTelefono, List<ItemVentaCommand> items) { }
