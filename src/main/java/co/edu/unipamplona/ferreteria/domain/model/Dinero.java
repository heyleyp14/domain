package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Valor monetario en pesos colombianos. Inmutable, se compara por valor y nunca existe en estado inválido.
 * Usa BigDecimal con 2 decimales: nunca double para dinero (RNF-09 del grupo: precisión decimal en IVA y totales).
 */
public record Dinero(BigDecimal valor) implements Comparable<Dinero> {

    public static final Dinero CERO = new Dinero(BigDecimal.ZERO);

    public Dinero {
        if (valor == null) {
            throw new ValorInvalidoException("El valor monetario es obligatorio");
        }
        if (valor.signum() < 0) {
            throw new ValorInvalidoException("El valor monetario no puede ser negativo");
        }
        valor = valor.setScale(2, RoundingMode.HALF_UP);
    }

    public static Dinero de(BigDecimal valor) { return new Dinero(valor); }

    public static Dinero de(long pesos) { return new Dinero(BigDecimal.valueOf(pesos)); }

    public static Dinero de(String texto) {
        if (texto == null) throw new ValorInvalidoException("El valor monetario es obligatorio");
        try {
            return new Dinero(new BigDecimal(texto.trim()));
        } catch (NumberFormatException e) {
            throw new ValorInvalidoException("Valor monetario inválido: " + texto);
        }
    }

    public Dinero sumar(Dinero otro) { return new Dinero(valor.add(otro.valor)); }

    public Dinero multiplicar(int factor) {
        if (factor < 0) throw new ValorInvalidoException("El factor no puede ser negativo");
        return new Dinero(valor.multiply(BigDecimal.valueOf(factor)));
    }

    public boolean esMayorQueCero() { return valor.signum() > 0; }

    @Override
    public int compareTo(Dinero otro) { return valor.compareTo(otro.valor); }
}
