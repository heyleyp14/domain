package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FacturaTest {

    private Factura ejemplo() {
        // 2 x 10.000 con IVA (subtotal 20.000, IVA 3.800) + 3 x 1.500 sin IVA (4.500)
        return Datos.factura("FAC-2026-000001", Datos.AHORA, "Ana Pérez", false,
                Datos.linea("MAR-01", 2, "10000", true), Datos.linea("CLA-01", 3, "1500", false));
    }

    @Test
    @DisplayName("Calcula subtotal, IVA y total con decimales exactos")
    void totales() {
        Factura f = ejemplo();
        assertEquals(Dinero.de("24500.00"), f.subtotal());
        assertEquals(Dinero.de("3800.00"), f.iva());
        assertEquals(Dinero.de("28300.00"), f.total());
        assertEquals(EstadoFactura.EMITIDA, f.getEstado());
    }

    @Test
    @DisplayName("El IVA se calcula por línea y la suma de las líneas coincide con el total impreso")
    void ivaPorLinea() {
        LineaFactura a = Datos.linea("A", 3, "33.33", true);   // subtotal 99.99, IVA 18.9981 -> 19.00
        LineaFactura b = Datos.linea("B", 1, "10.50", true);   // IVA 1.995 -> 2.00
        Factura f = Datos.factura("FAC-2026-000002", Datos.AHORA, "Cliente", false, a, b);
        assertEquals(Dinero.de("19.00"), a.iva());
        assertEquals(Dinero.de("21.00"), f.iva());
        assertEquals(a.total().sumar(b.total()), f.total());
    }

    @Test
    @DisplayName("Una factura necesita cliente (2–100 caracteres) y al menos un producto")
    void validaDatos() {
        LineaFactura l = Datos.linea("A", 1, "100", true);
        NumeroFactura n = NumeroFactura.desde("FAC-2026-000003");
        assertThrows(ValorInvalidoException.class, () -> Factura.emitir(n, "", null, null, "v", List.of(l), Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Factura.emitir(n, "Ana", null, null, "v", List.of(), Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Factura.emitir(n, "Ana", null, "abc", "v", List.of(l), Datos.AHORA));
    }

    @Test
    @DisplayName("Dirección y teléfono del cliente son opcionales")
    void clienteOpcional() {
        Factura f = Factura.emitir(NumeroFactura.desde("FAC-2026-000004"), "Ana", " ", null, "v", List.of(Datos.linea("A", 1, "100", true)), Datos.AHORA);
        assertNull(f.getClienteDireccion());
        assertNull(f.getClienteTelefono());
    }

    @Test
    @DisplayName("Anular exige motivo, deja la factura ANULADA con quién y cuándo, y no se puede repetir")
    void anular() {
        Factura f = ejemplo();
        assertThrows(ValorInvalidoException.class, () -> f.anular("", "admin", Datos.AHORA));
        f.anular("Cliente se arrepintió", "admin", Datos.AHORA.plusSeconds(60));
        assertTrue(f.estaAnulada());
        assertEquals("admin", f.getAnuladaPor());
        assertEquals(Datos.AHORA.plusSeconds(60), f.getAnuladaEn());
        assertThrows(EstadoInvalidoException.class, () -> f.anular("Otra vez", "admin", Datos.AHORA));
    }

    @Test
    @DisplayName("La cantidad de una línea debe ser positiva")
    void cantidadPositiva() {
        assertThrows(ValorInvalidoException.class, () -> Datos.linea("A", 0, "100", true));
        assertThrows(ValorInvalidoException.class, () -> Datos.linea("A", -1, "100", true));
    }

    @Test
    @DisplayName("El número tiene formato FAC-AAAA-NNNNNN y el consecutivo empieza en 1")
    void numero() {
        assertEquals("FAC-2026-000001", NumeroFactura.de(2026, 1).valor());
        assertEquals("FAC-2026-1234567", NumeroFactura.de(2026, 1234567).valor());
        assertEquals("FAC-2026-000007", NumeroFactura.desde(" fac-2026-000007 ").valor());
        assertThrows(ValorInvalidoException.class, () -> NumeroFactura.desde("123"));
        assertThrows(ValorInvalidoException.class, () -> NumeroFactura.de(2026, 0));
    }
}
