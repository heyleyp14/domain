package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import org.junit.jupiter.api.Test;

class NumeroALetrasTest {

    @Test
    void escribePesosConCentavos() {
        assertEquals("cero pesos con 00/100", NumeroALetras.pesos(Dinero.CERO));
        assertEquals("un peso con 50/100", NumeroALetras.pesos(Dinero.de("1.50")));
        assertEquals("veintitrés mil ochocientos pesos con 00/100", NumeroALetras.pesos(Dinero.de("23800")));
    }

    @Test
    void aplicaApocopesAntesDelSustantivo() {
        assertEquals("veintiún pesos con 00/100", NumeroALetras.pesos(Dinero.de("21")));
        assertEquals("treinta y un pesos con 00/100", NumeroALetras.pesos(Dinero.de("31")));
        assertEquals("ciento un pesos con 00/100", NumeroALetras.pesos(Dinero.de("101")));
    }

    @Test
    void cubreMilesMillonesYCienes() {
        assertEquals("cien pesos con 00/100", NumeroALetras.pesos(Dinero.de("100")));
        assertEquals("cien mil pesos con 00/100", NumeroALetras.pesos(Dinero.de("100000")));
        assertEquals("un millón de pesos con 00/100", NumeroALetras.pesos(Dinero.de("1000000")));
        assertEquals("dos millones de pesos con 00/100", NumeroALetras.pesos(Dinero.de("2000000")));
        assertEquals("mil millones de pesos con 00/100", NumeroALetras.pesos(Dinero.de("1000000000")));
    }

    @Test
    void escribeUnValorLargoConCentavos() {
        assertEquals("un millón doscientos treinta y cuatro mil quinientos sesenta y siete pesos con 89/100",
                NumeroALetras.pesos(Dinero.de("1234567.89")));
    }

    @Test
    void rechazaValoresFueraDeRango() {
        assertThrows(IllegalArgumentException.class,
                () -> NumeroALetras.pesos(Dinero.de("1000000000000")));
    }
}
