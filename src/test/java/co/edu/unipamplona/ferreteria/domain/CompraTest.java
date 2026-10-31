package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CompraTest {

    private LineaCompra linea(String codigo, int cantidad, String precio) {
        return new LineaCompra(codigo, "Producto " + codigo, cantidad, Dinero.de(precio));
    }

    @Test
    @DisplayName("Suma el total de las líneas: cantidad por precio de compra")
    void total() {
        Compra c = Compra.registrar(1, Datos.HOY, Datos.HOY, "admin", Datos.AHORA, List.of(linea("A", 10, "1250.50"), linea("B", 2, "300")));
        assertEquals(Dinero.de("13105.00"), c.total());
        assertEquals(Datos.HOY, c.getFecha());
        assertEquals("admin", c.getRegistradaPor());
    }

    @Test
    @DisplayName("Necesita al menos un producto, sin repetidos, y una fecha que no sea futura")
    void validaReglas() {
        assertThrows(ValorInvalidoException.class, () -> Compra.registrar(1, Datos.HOY, Datos.HOY, "a", Datos.AHORA, List.of()));
        assertThrows(ValorInvalidoException.class,
                () -> Compra.registrar(1, Datos.HOY, Datos.HOY, "a", Datos.AHORA, List.of(linea("A", 1, "5"), linea("A", 2, "6"))));
        assertThrows(ValorInvalidoException.class,
                () -> Compra.registrar(1, Datos.HOY.plusDays(1), Datos.HOY, "a", Datos.AHORA, List.of(linea("A", 1, "5"))));
        Compra ayer = Compra.registrar(1, Datos.HOY.minusDays(30), Datos.HOY, "a", Datos.AHORA, List.of(linea("A", 1, "5")));
        assertEquals(Datos.HOY.minusDays(30), ayer.getFecha());
    }

    @Test
    @DisplayName("Cantidad y precio de cada línea deben ser positivos")
    void lineaValida() {
        assertThrows(ValorInvalidoException.class, () -> linea("A", 0, "5"));
        assertThrows(ValorInvalidoException.class, () -> linea("A", 1, "0"));
    }

    @Test
    @DisplayName("El código CMP-000123 se arma y se lee de vuelta")
    void codigo() {
        assertEquals("CMP-000123", Compra.codigoDe(123L));
        assertEquals(123L, Compra.leerCodigo("CMP-000123"));
        assertEquals(123L, Compra.leerCodigo(" cmp-000123 "));
        assertEquals(7L, Compra.leerCodigo("7"));
        assertThrows(ValorInvalidoException.class, () -> Compra.leerCodigo("XYZ"));
        assertThrows(ValorInvalidoException.class, () -> Compra.leerCodigo("CMP-0"));
    }
}
