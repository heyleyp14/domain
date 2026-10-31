package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.util.Locale;
import java.util.regex.Pattern;

/** Número consecutivo de factura. Formato: FAC-AAAA-NNNNNN, con consecutivo por año. */
public record NumeroFactura(String valor) {

    private static final Pattern FORMATO = Pattern.compile("FAC-\\d{4}-\\d{6,}");

    public NumeroFactura {
        if (valor == null || valor.isBlank()) {
            throw new ValorInvalidoException("El número de factura es obligatorio");
        }
        valor = valor.trim().toUpperCase(Locale.ROOT);
        if (!FORMATO.matcher(valor).matches()) {
            throw new ValorInvalidoException("Número de factura inválido: " + valor);
        }
    }

    /** Arma el número a partir del año y el consecutivo que entrega el puerto de numeración. */
    public static NumeroFactura de(int anio, long secuencia) {
        if (anio < 2000 || anio > 9999 || secuencia < 1) {
            throw new ValorInvalidoException("Año o consecutivo de factura inválido");
        }
        return new NumeroFactura(String.format(Locale.ROOT, "FAC-%d-%06d", anio, secuencia));
    }

    public static NumeroFactura desde(String texto) { return new NumeroFactura(texto); }

    @Override
    public String toString() { return valor; }
}
