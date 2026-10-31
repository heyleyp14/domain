package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Iva;
import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DineroEIvaTest {

    @Test
    @DisplayName("El IVA es el 19 % con 2 decimales")
    void ivaDel19() {
        assertEquals(Dinero.de("1900.00"), Iva.sobre(Dinero.de("10000")));
        assertEquals(Dinero.de("0.00"), Iva.sobre(Dinero.CERO));
    }

    @Test
    @DisplayName("El IVA se redondea hacia arriba a partir de la mitad (HALF_UP): 6.3327 -> 6.33 y 1.995 -> 2.00")
    void redondeoDelIva() {
        assertEquals(Dinero.de("6.33"), Iva.sobre(Dinero.de("33.33")));
        assertEquals(Dinero.de("2.00"), Iva.sobre(Dinero.de("10.50")));
    }

    @Test
    @DisplayName("Los decimales son exactos: 0.1 + 0.2 es 0.30 (con double daría 0.30000000000000004)")
    void decimalesExactos() {
        assertEquals(Dinero.de("0.30"), Dinero.de("0.1").sumar(Dinero.de("0.2")));
    }

    @Test
    @DisplayName("Multiplicar por la cantidad conserva los centavos")
    void multiplicar() {
        assertEquals(Dinero.de("29997.00"), Dinero.de("9999").multiplicar(3));
        assertEquals(Dinero.de("1.05"), Dinero.de("0.35").multiplicar(3));
    }

    @Test
    @DisplayName("No existe un valor monetario negativo, nulo o ilegible")
    void valoresInvalidos() {
        assertThrows(ValorInvalidoException.class, () -> Dinero.de(new BigDecimal("-1")));
        assertThrows(ValorInvalidoException.class, () -> Dinero.de((BigDecimal) null));
        assertThrows(ValorInvalidoException.class, () -> Dinero.de("abc"));
        assertThrows(ValorInvalidoException.class, () -> Dinero.de("5").multiplicar(-1));
    }

    @Test
    @DisplayName("Dos valores iguales con distinta escritura son el mismo valor")
    void igualdadPorValor() {
        assertEquals(Dinero.de("5"), Dinero.de("5.000"));
        assertTrue(Dinero.de("5").compareTo(Dinero.de("5.00")) == 0);
        assertTrue(Dinero.de("5").compareTo(Dinero.de("6")) < 0);
    }
}
