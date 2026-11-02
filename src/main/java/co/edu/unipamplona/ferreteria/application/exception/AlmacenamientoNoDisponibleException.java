package co.edu.unipamplona.ferreteria.application.exception;

/** El almacenamiento externo de archivos no esta configurado o no respondio. */
public class AlmacenamientoNoDisponibleException extends RuntimeException {

    public AlmacenamientoNoDisponibleException(String mensaje) {
        super(mensaje);
    }

    public AlmacenamientoNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
