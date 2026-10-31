package co.edu.unipamplona.ferreteria.domain.model;

import java.time.Instant;

/** Quién creó y quién modificó por última vez un registro, y cuándo (trazabilidad). Valor inmutable. */
public record Auditoria(String creadoPor, Instant creadoEn, String modificadoPor, Instant modificadoEn) {

    public static Auditoria creada(String usuario, Instant ahora) {
        return new Auditoria(usuario, ahora, usuario, ahora);
    }

    public Auditoria modificada(String usuario, Instant ahora) {
        return new Auditoria(creadoPor, creadoEn, usuario, ahora);
    }
}
