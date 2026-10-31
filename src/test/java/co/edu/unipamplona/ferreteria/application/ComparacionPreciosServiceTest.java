package co.edu.unipamplona.ferreteria.application;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.in.command.ItemCompraCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.RegistrarCompraCommand;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ComparacionPreciosServiceTest {

    private final Escenario e = new Escenario();
    private Proveedor aceros;
    private Proveedor bodega;

    @BeforeEach
    void preparar() {
        aceros = e.proveedor("Aceros del Norte");
        bodega = e.proveedor("Bodega Central");
        e.producto("MAR-01", "25000", true, 0, aceros);
        e.producto("CLA-01", "100", false, 0, aceros);
    }

    private void comprar(Proveedor p, String fecha, String codigo, String precio) {
        e.compra.registrar(e.admin(), new RegistrarCompraCommand(p.getId(), fecha,
                List.of(new ItemCompraCommand(codigo, 1, new BigDecimal(precio)))));
    }

    @Test
    @DisplayName("Muestra el precio de cada proveedor e indica cuál ofreció el menor")
    void comparaProveedores() {
        comprar(aceros, "2026-09-01", "MAR-01", "18000");
        comprar(bodega, "2026-09-10", "MAR-01", "17500");
        ComparacionPrecios r = e.comparacion.comparar(e.admin(), "mar-01");
        assertEquals("MAR-01", r.codigoProducto());
        assertEquals(2, r.ofertas().size());
        assertEquals("Bodega Central", r.mejor().proveedorNombre());
        assertEquals(Dinero.de("17500"), r.mejor().ultimoPrecio());
        assertTrue(r.mejor().esMenor());
        assertFalse(r.ofertas().get(1).esMenor());
    }

    @Test
    @DisplayName("Usa el precio más reciente de cada proveedor y también muestra el menor histórico")
    void precioVigente() {
        comprar(aceros, "2026-01-01", "MAR-01", "15000");
        comprar(aceros, "2026-09-01", "MAR-01", "19000");
        comprar(bodega, "2026-08-01", "MAR-01", "17000");
        ComparacionPrecios r = e.comparacion.comparar(e.admin(), "MAR-01");
        assertEquals("Bodega Central", r.mejor().proveedorNombre());
        ComparacionPrecios.Oferta oferta = r.ofertas().get(1);
        assertEquals("Aceros del Norte", oferta.proveedorNombre());
        assertEquals(Dinero.de("19000"), oferta.ultimoPrecio());
        assertEquals(Dinero.de("15000"), oferta.menorPrecioHistorico());
        assertEquals(2, oferta.compras());
    }

    @Test
    @DisplayName("Solo cuenta las compras del producto consultado")
    void soloEseProducto() {
        comprar(aceros, "2026-09-01", "MAR-01", "18000");
        comprar(bodega, "2026-09-01", "CLA-01", "50");
        assertEquals(1, e.comparacion.comparar(e.admin(), "MAR-01").ofertas().size());
    }

    @Test
    @DisplayName("Un producto sin compras no es un error: la comparación sale vacía")
    void sinCompras() {
        ComparacionPrecios r = e.comparacion.comparar(e.admin(), "CLA-01");
        assertFalse(r.hayCompras());
        assertNull(r.mejor());
    }

    @Test
    @DisplayName("Producto inexistente 404, código mal escrito 400 y solo el administrador compara (403)")
    void validaciones() {
        assertThrows(ProductoNoEncontradoException.class, () -> e.comparacion.comparar(e.admin(), "NO-1"));
        assertThrows(ValorInvalidoException.class, () -> e.comparacion.comparar(e.admin(), "mal código"));
        assertThrows(ValorInvalidoException.class, () -> e.comparacion.comparar(e.admin(), " "));
        assertThrows(AccesoDenegadoException.class, () -> e.comparacion.comparar(e.vendedor(), "MAR-01"));
    }
}
