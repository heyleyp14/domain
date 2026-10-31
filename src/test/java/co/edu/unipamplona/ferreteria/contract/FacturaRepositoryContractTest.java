package co.edu.unipamplona.ferreteria.contract;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

public abstract class FacturaRepositoryContractTest {

    protected abstract FacturaRepositoryPort repo();

    private Factura nueva(String numero, Instant fecha) {
        return Datos.factura(numero, fecha, "Ana Pérez", false, Datos.linea("MAR-01", 2, "10000", true), Datos.linea("CLA-01", 3, "1500.50", false));
    }

    @Test
    void guardaYRecuperaFacturaConSusLineas() {
        Factura g = repo().guardar(nueva("FAC-2026-000001", Datos.AHORA));
        assertNotNull(g.getId());
        Factura r = repo().buscarPorNumero("FAC-2026-000001").orElseThrow();
        assertEquals("Ana Pérez", r.getClienteNombre());
        assertEquals("Calle 1 # 2-3", r.getClienteDireccion());
        assertEquals("3101234567", r.getClienteTelefono());
        assertEquals("vendedor1", r.getVendedor());
        assertEquals(Datos.AHORA, r.getFecha());
        assertEquals(EstadoFactura.EMITIDA, r.getEstado());
        assertEquals(2, r.getLineas().size());
        assertEquals("MAR-01", r.getLineas().get(0).codigoProducto());
        assertEquals("Producto MAR-01", r.getLineas().get(0).nombreProducto());
        assertEquals(2, r.getLineas().get(0).cantidad());
        assertEquals(Dinero.de("10000"), r.getLineas().get(0).precioBase());
        assertTrue(r.getLineas().get(0).aplicaIva());
        assertFalse(r.getLineas().get(1).aplicaIva());
        assertEquals(Dinero.de("1500.50"), r.getLineas().get(1).precioBase());
        assertEquals(g.total(), r.total());
        assertEquals(Dinero.de("28301.50"), r.total());
        assertTrue(repo().buscarPorNumero("FAC-2026-000099").isEmpty());
        assertTrue(repo().buscarPorNumeroBloqueando("FAC-2026-000001").isPresent());
        assertTrue(repo().buscarPorNumeroBloqueando("FAC-2026-000099").isEmpty());
    }

    @Test
    void guardaOpcionalesNulos() {
        Factura f = Factura.emitir(NumeroFactura.desde("FAC-2026-000001"), "Ana", null, null, "v", List.of(Datos.linea("A", 1, "100", true)), Datos.AHORA);
        repo().guardar(f);
        Factura r = repo().buscarPorNumero("FAC-2026-000001").orElseThrow();
        assertNull(r.getClienteDireccion());
        assertNull(r.getClienteTelefono());
    }

    @Test
    void guardaLaAnulacion() {
        repo().guardar(nueva("FAC-2026-000001", Datos.AHORA));
        Factura c = repo().buscarPorNumero("FAC-2026-000001").orElseThrow();
        c.anular("Error en el pedido", "admin", Datos.AHORA.plusSeconds(300));
        repo().guardar(c);
        Factura r = repo().buscarPorNumero("FAC-2026-000001").orElseThrow();
        assertEquals(EstadoFactura.ANULADA, r.getEstado());
        assertEquals("admin", r.getAnuladaPor());
        assertEquals(Datos.AHORA.plusSeconds(300), r.getAnuladaEn());
        assertEquals("Error en el pedido", r.getMotivoAnulacion());
        assertEquals(2, r.getLineas().size());
    }

    @Test
    void buscaEmitidasEnUnIntervaloSemiAbiertoYOrdenadas() {
        Instant base = Instant.parse("2026-10-20T05:00:00Z");
        repo().guardar(nueva("FAC-2026-000003", base.plusSeconds(7200)));
        repo().guardar(nueva("FAC-2026-000001", base.minusSeconds(1)));          // un segundo antes: fuera
        repo().guardar(nueva("FAC-2026-000002", base));                          // justo al inicio: dentro
        repo().guardar(nueva("FAC-2026-000004", base.plusSeconds(86400)));       // justo al final: fuera
        List<Factura> r = repo().buscarEmitidasEntre(base, base.plusSeconds(86400));
        assertEquals(List.of("FAC-2026-000002", "FAC-2026-000003"), r.stream().map(f -> f.getNumero().valor()).toList());
        assertTrue(repo().buscarEmitidasEntre(base.plusSeconds(10 * 86400), base.plusSeconds(11 * 86400)).isEmpty());
    }

    @Test
    void incluyeLasAnuladasEnLaBusqueda() {
        repo().guardar(Datos.factura("FAC-2026-000001", Datos.AHORA, "Ana", true, Datos.linea("A", 1, "100", true)));
        List<Factura> r = repo().buscarEmitidasEntre(Datos.AHORA.minusSeconds(60), Datos.AHORA.plusSeconds(600));
        assertEquals(1, r.size());
        assertTrue(r.get(0).estaAnulada());
    }
}
