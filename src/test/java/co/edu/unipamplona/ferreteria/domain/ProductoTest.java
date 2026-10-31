package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ProductoTest {

    private Producto martillo() { return Datos.producto("mar-01", "25000", true, 10, 1); }

    @Test
    @DisplayName("Registra con código normalizado, activo y con trazabilidad de quién y cuándo")
    void registraValido() {
        Producto p = martillo();
        assertEquals("MAR-01", p.getCodigo());
        assertTrue(p.isActivo());
        assertEquals(10, p.getStock());
        assertEquals("admin", p.getAuditoria().creadoPor());
        assertEquals(Datos.AHORA, p.getAuditoria().creadoEn());
    }

    @Test
    @DisplayName("Rechaza precio negativo, cero o nulo, y stock inicial negativo")
    void rechazaNumerosInvalidos() {
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "Clavo", new BigDecimal("-5"), true, 1, 1L, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "Clavo", BigDecimal.ZERO, true, 1, 1L, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "Clavo", null, true, 1, 1L, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "Clavo", new BigDecimal("5"), true, -1, 1L, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "Clavo", new BigDecimal("5"), null, 1, 1L, "a", Datos.AHORA));
    }

    @Test
    @DisplayName("Valida código (2–20, letras, números o guion), nombre y proveedor obligatorio")
    void validaTextos() {
        assertThrows(ValorInvalidoException.class, () -> Producto.normalizarCodigo("A"));
        assertThrows(ValorInvalidoException.class, () -> Producto.normalizarCodigo("con espacio"));
        assertThrows(ValorInvalidoException.class, () -> Producto.normalizarCodigo(null));
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "x", new BigDecimal("5"), true, 1, 1L, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Producto.registrar("A1", "Clavo", new BigDecimal("5"), true, 1, null, "a", Datos.AHORA));
    }

    @Test
    @DisplayName("El precio final suma el IVA solo si el producto lo lleva")
    void precioFinal() {
        assertEquals(Dinero.de("29750.00"), martillo().precioFinal());
        assertEquals(Dinero.de("25000.00"), Datos.producto("SIN-IVA", "25000", false, 1, 1).precioFinal());
    }

    @Test
    @DisplayName("Stock bajo: 5 unidades o menos")
    void stockBajo() {
        assertTrue(Datos.producto("B5", "100", true, 5, 1).stockBajo());
        assertTrue(Datos.producto("B0", "100", true, 0, 1).stockBajo());
        assertFalse(Datos.producto("B6", "100", true, 6, 1).stockBajo());
    }

    @Test
    @DisplayName("Descontar baja el stock; pedir más de lo que hay informa el faltante y no modifica nada")
    void descontar() {
        Producto p = martillo();
        p.descontar(4, "vendedor1", Datos.AHORA.plusSeconds(60));
        assertEquals(6, p.getStock());
        StockInsuficienteException e = assertThrows(StockInsuficienteException.class, () -> p.descontar(7, "v", Datos.AHORA));
        assertEquals(1, e.getFaltantes().size());
        assertEquals(6, e.getFaltantes().get(0).disponible());
        assertEquals(6, p.getStock());
        p.descontar(6, "v", Datos.AHORA);
        assertEquals(0, p.getStock());
        assertThrows(ValorInvalidoException.class, () -> p.descontar(0, "v", Datos.AHORA));
    }

    @Test
    @DisplayName("Reponer aumenta el stock y respeta el máximo")
    void reponer() {
        Producto p = martillo();
        p.reponer(5, "admin", Datos.AHORA);
        assertEquals(15, p.getStock());
        assertThrows(ValorInvalidoException.class, () -> p.reponer(0, "admin", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> p.reponer(1_000_000, "admin", Datos.AHORA));
    }

    @Test
    @DisplayName("Editar cambia los datos comerciales pero no el stock, y conserva quién lo creó")
    void editar() {
        Producto p = martillo();
        Instant despues = Datos.AHORA.plusSeconds(3600);
        p.editar("Martillo de uña", new BigDecimal("27000"), false, 2L, "admin2", despues);
        assertEquals("Martillo de uña", p.getNombre());
        assertEquals(Dinero.de("27000.00"), p.getPrecioBase());
        assertFalse(p.isAplicaIva());
        assertEquals(2L, p.getProveedorId());
        assertEquals(10, p.getStock());
        assertEquals("MAR-01", p.getCodigo());
        assertEquals("admin", p.getAuditoria().creadoPor());
        assertEquals("admin2", p.getAuditoria().modificadoPor());
        assertEquals(despues, p.getAuditoria().modificadoEn());
    }

    @Test
    @DisplayName("Una edición inválida no deja el producto a medias")
    void editarInvalidoNoCambiaNada() {
        Producto p = martillo();
        assertThrows(ValorInvalidoException.class, () -> p.editar("Nuevo nombre", new BigDecimal("-1"), true, 1L, "a", Datos.AHORA));
        assertEquals("Producto mar-01", p.getNombre());
    }

    @Test
    @DisplayName("Desactivar saca el producto de la venta; repetir la operación es un conflicto")
    void desactivarYActivar() {
        Producto p = martillo();
        p.desactivar("admin", Datos.AHORA);
        assertFalse(p.isActivo());
        assertThrows(EstadoInvalidoException.class, p::asegurarVendible);
        assertThrows(EstadoInvalidoException.class, () -> p.desactivar("admin", Datos.AHORA));
        p.activar("admin", Datos.AHORA);
        assertTrue(p.isActivo());
        p.asegurarVendible();
        assertThrows(EstadoInvalidoException.class, () -> p.activar("admin", Datos.AHORA));
    }
}
