package co.edu.unipamplona.ferreteria.contract;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.util.List;
import org.junit.jupiter.api.Test;

public abstract class ProveedorRepositoryContractTest {

    protected abstract ProveedorRepositoryPort repo();

    @Test
    void guardaYRecuperaTodo() {
        Proveedor g = repo().guardar(Proveedor.registrar("Aceros del Norte", "3001234567", "v@aceros.co", "Av. 1 # 2-3", "admin", Datos.AHORA));
        assertNotNull(g.getId());
        Proveedor r = repo().buscarPorId(g.getId()).orElseThrow();
        assertEquals("Aceros del Norte", r.getNombre());
        assertEquals("3001234567", r.getTelefono());
        assertEquals("v@aceros.co", r.getCorreo());
        assertEquals("Av. 1 # 2-3", r.getDireccion());
        assertEquals("admin", r.getAuditoria().creadoPor());
        assertEquals(Datos.AHORA, r.getAuditoria().creadoEn());
        assertTrue(repo().buscarPorId(12345).isEmpty());
    }

    @Test
    void guardaOpcionalesNulos() {
        Proveedor g = repo().guardar(Proveedor.registrar("Solo Teléfono", "3001234567", null, null, "admin", Datos.AHORA));
        Proveedor r = repo().buscarPorId(g.getId()).orElseThrow();
        assertNull(r.getCorreo());
        assertNull(r.getDireccion());
    }

    @Test
    void actualizaYConservaLaAuditoria() {
        Proveedor g = repo().guardar(Datos.proveedor("Aceros del Norte"));
        Proveedor c = repo().buscarPorId(g.getId()).orElseThrow();
        c.editar("Aceros y Más", null, "nuevo@aceros.co", null, "admin2", Datos.AHORA.plusSeconds(600));
        repo().guardar(c);
        Proveedor r = repo().buscarPorId(g.getId()).orElseThrow();
        assertEquals("Aceros y Más", r.getNombre());
        assertNull(r.getTelefono());
        assertEquals("nuevo@aceros.co", r.getCorreo());
        assertEquals("admin", r.getAuditoria().creadoPor());
        assertEquals("admin2", r.getAuditoria().modificadoPor());
        assertEquals(Datos.AHORA.plusSeconds(600), r.getAuditoria().modificadoEn());
    }

    @Test
    void buscaPorNombreNormalizado() {
        repo().guardar(Datos.proveedor("Aceros   del Norte"));
        assertTrue(repo().buscarPorNombre(Proveedor.normalizarNombre("ACEROS DEL NORTE")).isPresent());
        assertTrue(repo().buscarPorNombre(Proveedor.normalizarNombre("Otro")).isEmpty());
    }

    @Test
    void buscaPorIds() {
        Proveedor a = repo().guardar(Datos.proveedor("Zeta"));
        Proveedor b = repo().guardar(Datos.proveedor("Alfa"));
        repo().guardar(Datos.proveedor("Beta"));
        assertEquals(List.of("Alfa", "Zeta"), repo().buscarPorIds(List.of(a.getId(), b.getId(), 999L)).stream().map(Proveedor::getNombre).toList());
        assertTrue(repo().buscarPorIds(List.of()).isEmpty());
    }

    @Test
    void listaPorNombreYFiltraPorTexto() {
        repo().guardar(Datos.proveedor("Zinc SA"));
        repo().guardar(Datos.proveedor("Aceros del Norte"));
        repo().guardar(Datos.proveedor("Pinturas Cúcuta"));
        assertEquals(List.of("Aceros del Norte", "Pinturas Cúcuta", "Zinc SA"), repo().buscar(null).stream().map(Proveedor::getNombre).toList());
        assertEquals(List.of("Aceros del Norte"), repo().buscar("ACEROS").stream().map(Proveedor::getNombre).toList());
        assertEquals(List.of("Pinturas Cúcuta"), repo().buscar("cúcuta").stream().map(Proveedor::getNombre).toList());
        assertTrue(repo().buscar("zzz").isEmpty());
    }
}
