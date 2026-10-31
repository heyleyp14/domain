package co.edu.unipamplona.ferreteria.application.port.in.command;

public record EditarProveedorCommand(long id, String nombre, String telefono, String correo, String direccion) { }
