package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

public enum UnidadMedida {
    UNIDAD, CAJA, PAQUETE, KILOGRAMO, GRAMO, LITRO, MILILITRO, METRO, METRO_CUADRADO, PAR;

    public static UnidadMedida deRegistro(String valor) {
        return valor == null || valor.isBlank() ? UNIDAD : desde(valor);
    }

    public static UnidadMedida desde(String valor) {
        if (valor == null || valor.isBlank()) {
            throw new ValorInvalidoException("La unidad de medida es obligatoria");
        }
        try {
            return valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ValorInvalidoException("La unidad de medida no es válida. Valores permitidos: " + permitidos());
        }
    }

    public static String permitidos() {
        return Arrays.stream(values()).map(Enum::name).collect(Collectors.joining(", "));
    }
}
