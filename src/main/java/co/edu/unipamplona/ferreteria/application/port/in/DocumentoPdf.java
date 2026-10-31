package co.edu.unipamplona.ferreteria.application.port.in;

/** Un PDF listo para descargar. */
public record DocumentoPdf(String nombreArchivo, byte[] contenido) { }
