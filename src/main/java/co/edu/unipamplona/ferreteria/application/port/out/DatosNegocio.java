package co.edu.unipamplona.ferreteria.application.port.out;

/** Datos del negocio que se imprimen en la factura y en los reportes PDF. */
public record DatosNegocio(String nombre, String ciudad, String direccion, String telefono, String identificacion) { }
