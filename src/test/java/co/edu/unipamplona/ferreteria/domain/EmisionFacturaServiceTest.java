package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.domain.service.EmisionFacturaService;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EmisionFacturaServiceTest {

    private final EmisionFacturaService servicio = new EmisionFacturaService();

    private Map<String, Producto> catalogo(Producto... ps) {
        Map<String, Producto> m = new LinkedHashMap<>();
        for (Producto p : ps) m.put(p.getCodigo(), p);
        return m;
    }

    @Test
    @DisplayName("Un producto repetido en varias líneas se suma antes de validar, conservando el orden")
    void consolidaRepetidos() {
        List<ItemVenta> r = servicio.consolidar(List.of(new ItemVenta("A", 2), new ItemVenta("B", 1), new ItemVenta("A", 3)));
        assertEquals(List.of(new ItemVenta("A", 5), new ItemVenta("B", 1)), r);
    }

    @Test
    @DisplayName("Una venta sin productos o con cantidad no positiva se rechaza")
    void rechazaVentaInvalida() {
        assertThrows(ValorInvalidoException.class, () -> servicio.consolidar(List.of()));
        assertThrows(ValorInvalidoException.class, () -> servicio.consolidar(List.of(new ItemVenta("A", 0))));
        assertThrows(ValorInvalidoException.class, () -> servicio.consolidar(List.of(new ItemVenta("A", -2))));
    }

    @Test
    @DisplayName("Las líneas congelan el nombre y el precio del producto y no tocan el stock")
    void armaLineas() {
        Producto a = Datos.producto("A1", "1000", true, 10, 1);
        Producto b = Datos.producto("B1", "500", false, 4, 1);
        List<LineaFactura> lineas = servicio.prepararLineas(List.of(new ItemVenta("A1", 3), new ItemVenta("B1", 4)), catalogo(a, b));
        assertEquals(2, lineas.size());
        assertEquals("A1", lineas.get(0).codigoProducto());
        assertEquals(Dinero.de("1000.00"), lineas.get(0).precioBase());
        assertTrue(lineas.get(0).aplicaIva());
        assertEquals(10, a.getStock());
        assertEquals(4, b.getStock());
    }

    @Test
    @DisplayName("Si faltan existencias se informan TODOS los productos que no alcanzan")
    void informaTodosLosFaltantes() {
        Producto a = Datos.producto("A1", "1000", true, 2, 1);
        Producto b = Datos.producto("B1", "500", true, 9, 1);
        Producto c = Datos.producto("C1", "700", true, 1, 1);
        StockInsuficienteException e = assertThrows(StockInsuficienteException.class,
                () -> servicio.prepararLineas(List.of(new ItemVenta("A1", 5), new ItemVenta("B1", 9), new ItemVenta("C1", 2)),
                        catalogo(a, b, c)));
        assertEquals(2, e.getFaltantes().size());
        assertEquals("A1", e.getFaltantes().get(0).codigo());
        assertEquals("C1", e.getFaltantes().get(1).codigo());
        assertEquals(2, e.getFaltantes().get(0).disponible());
        assertEquals(5, e.getFaltantes().get(0).solicitado());
    }

    @Test
    @DisplayName("Un producto desactivado no se vende")
    void productoInactivo() {
        Producto a = Datos.producto("A1", "1000", true, 10, 1);
        a.desactivar("admin", Datos.AHORA);
        assertThrows(EstadoInvalidoException.class, () -> servicio.prepararLineas(List.of(new ItemVenta("A1", 1)), catalogo(a)));
    }

    @Test
    @DisplayName("Pedir exactamente el stock disponible es válido")
    void justoElStock() {
        Producto a = Datos.producto("A1", "1000", true, 3, 1);
        assertEquals(1, servicio.prepararLineas(List.of(new ItemVenta("A1", 3)), catalogo(a)).size());
    }
}
