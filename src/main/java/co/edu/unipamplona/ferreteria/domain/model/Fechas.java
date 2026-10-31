package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalTime;

public final class Fechas {

    private Fechas() { }

    /** Lee una fecha escrita como AAAA-MM-DD; cualquier otra cosa es un error de validación con un mensaje claro. */
    public static LocalDate leer(String texto, String nombre) {
        try {
            return LocalDate.parse(texto.trim());
        } catch (DateTimeException | NullPointerException e) {
            throw new ValorInvalidoException("La " + nombre + " no es válida: use el formato AAAA-MM-DD");
        }
    }

    /** Lee una hora escrita como HH:mm (24 horas). */
    public static LocalTime leerHora(String texto, String nombre) {
        try {
            return LocalTime.parse(texto.trim());
        } catch (DateTimeException | NullPointerException e) {
            throw new ValorInvalidoException("La " + nombre + " no es válida: use el formato HH:mm");
        }
    }
}
