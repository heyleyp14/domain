package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.util.regex.Pattern;

/** Validaciones de datos de contacto compartidas por proveedores y clientes de una factura. */
public final class Contacto {

    private static final Pattern TELEFONO = Pattern.compile("^[0-9+()\\-\\s]{7,20}$");
    private static final Pattern CORREO = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private Contacto() { }

    /** Texto opcional: vacío se vuelve null; si llega, se valida el largo máximo. */
    public static String opcional(String texto, String campo, int max) {
        if (texto == null || texto.isBlank()) return null;
        String limpio = texto.trim();
        if (limpio.length() > max) throw new ValorInvalidoException(campo + " no puede superar " + max + " caracteres");
        return limpio;
    }

    public static String telefonoOpcional(String telefono) {
        String t = opcional(telefono, "El teléfono", 20);
        if (t != null && !TELEFONO.matcher(t).matches()) {
            throw new ValorInvalidoException("Teléfono inválido: use de 7 a 20 caracteres (dígitos, +, paréntesis, guion o espacio)");
        }
        return t;
    }

    public static String correoOpcional(String correo) {
        String c = opcional(correo, "El correo", 254);
        if (c != null && !CORREO.matcher(c).matches()) {
            throw new ValorInvalidoException("Correo electrónico inválido");
        }
        return c;
    }

    /** Texto obligatorio con largo mínimo y máximo. */
    public static String obligatorio(String texto, String campo, int min, int max) {
        String t = texto == null ? "" : texto.trim();
        if (t.length() < min || t.length() > max) {
            throw new ValorInvalidoException(campo + " debe tener entre " + min + " y " + max + " caracteres");
        }
        return t;
    }
}
