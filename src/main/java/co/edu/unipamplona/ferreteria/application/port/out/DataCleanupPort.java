package co.edu.unipamplona.ferreteria.application.port.out;

/**
 * Puerto de salida para operaciones de limpieza/administración de la base de datos.
 *
 * <p>Se usa por herramientas de administración (ej. seed) para borrar datos de forma
 * masiva, respetando el principio de que la capa de aplicación no referencias clases JPA
 * concretas.</p>
 */
public interface DataCleanupPort {

    /** Borra todas las tablas relevantes (y las tablas de soporte como numeración) dejando la base vacía. */
    void limpiarTodo();
}
