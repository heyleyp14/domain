package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios;
import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios.Oferta;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.PrecioCompra;
import co.edu.unipamplona.ferreteria.domain.service.ComparadorPrecios;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ComparadorPreciosTest {

    private final ComparadorPrecios comparador = new ComparadorPrecios();
    private final Map<Long, String> nombres = Map.of(1L, "Aceros del Norte", 2L, "Bodega Central", 3L, "Casa Tornillo");

    private PrecioCompra precio(long compra, long proveedor, String fecha, String valor) {
        return new PrecioCompra(compra, proveedor, LocalDate.parse(fecha), Dinero.de(valor));
    }

    @Test
    @DisplayName("Sin compras no hay ofertas ni mejor proveedor, y no es un error")
    void sinCompras() {
        ComparacionPrecios r = comparador.comparar("MAR-01", "Martillo", List.of(), nombres);
        assertFalse(r.hayCompras());
        assertNull(r.mejor());
    }

    @Test
    @DisplayName("Compara el precio MÁS RECIENTE de cada proveedor y marca al menor")
    void comparaElPrecioVigente() {
        ComparacionPrecios r = comparador.comparar("MAR-01", "Martillo", List.of(
                precio(1, 1, "2026-01-10", "9000"),     // Aceros: antes barato...
                precio(2, 1, "2026-09-01", "12000"),    // ...ahora caro (vigente 12.000, mínimo histórico 9.000)
                precio(3, 2, "2026-08-15", "10500")), nombres);
        assertEquals(2, r.ofertas().size());
        Oferta mejor = r.mejor();
        assertEquals("Bodega Central", mejor.proveedorNombre());
        assertEquals(Dinero.de("10500"), mejor.ultimoPrecio());
        assertTrue(mejor.esMenor());
        Oferta aceros = r.ofertas().get(1);
        assertEquals(Dinero.de("12000"), aceros.ultimoPrecio());
        assertEquals(Dinero.de("9000"), aceros.menorPrecioHistorico());
        assertEquals(2, aceros.compras());
        assertFalse(aceros.esMenor());
    }

    @Test
    @DisplayName("Si dos compras son de la misma fecha, vale la última registrada")
    void desempateMismaFecha() {
        ComparacionPrecios r = comparador.comparar("A", "A", List.of(precio(1, 1, "2026-05-05", "100"), precio(2, 1, "2026-05-05", "120")), nombres);
        assertEquals(Dinero.de("120"), r.mejor().ultimoPrecio());
    }

    @Test
    @DisplayName("Con precios empatados, todos los empatados quedan marcados y se ordenan por nombre")
    void empate() {
        ComparacionPrecios r = comparador.comparar("A", "A", List.of(
                precio(1, 3, "2026-05-05", "100"), precio(2, 2, "2026-05-06", "100"), precio(3, 1, "2026-05-07", "150")), nombres);
        assertEquals("Bodega Central", r.ofertas().get(0).proveedorNombre());
        assertEquals("Casa Tornillo", r.ofertas().get(1).proveedorNombre());
        assertTrue(r.ofertas().get(0).esMenor());
        assertTrue(r.ofertas().get(1).esMenor());
        assertFalse(r.ofertas().get(2).esMenor());
    }

    @Test
    @DisplayName("Un proveedor desconocido no rompe la comparación")
    void proveedorSinNombre() {
        ComparacionPrecios r = comparador.comparar("A", "A", List.of(precio(1, 9, "2026-05-05", "100")), nombres);
        assertEquals("Proveedor 9", r.mejor().proveedorNombre());
    }
}
