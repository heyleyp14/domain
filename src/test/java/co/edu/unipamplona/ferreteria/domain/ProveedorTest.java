package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ProveedorTest {

    @Test
    @DisplayName("Registra con nombre y al menos un dato de contacto")
    void registraValido() {
        Proveedor p = Proveedor.registrar("  Pinturas del Norte ", "607 5551234", null, null, "admin", Datos.AHORA);
        assertEquals("Pinturas del Norte", p.getNombre());
        assertEquals("607 5551234", p.getTelefono());
        assertNull(p.getCorreo());
        assertEquals("admin", p.getAuditoria().creadoPor());
    }

    @Test
    @DisplayName("Sin teléfono ni correo no hay contacto: se rechaza")
    void exigeContacto() {
        assertThrows(ValorInvalidoException.class, () -> Proveedor.registrar("Pinturas del Norte", null, "", null, "a", Datos.AHORA));
    }

    @Test
    @DisplayName("Valida nombre, teléfono y correo")
    void validaFormatos() {
        assertThrows(ValorInvalidoException.class, () -> Proveedor.registrar("X", "3001234567", null, null, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Proveedor.registrar("Pinturas", "abc", null, null, "a", Datos.AHORA));
        assertThrows(ValorInvalidoException.class, () -> Proveedor.registrar("Pinturas", null, "no-es-correo", null, "a", Datos.AHORA));
    }

    @Test
    @DisplayName("El nombre se normaliza para detectar duplicados: sin mayúsculas ni espacios repetidos")
    void normalizaNombre() {
        assertEquals("pinturas del norte", Proveedor.normalizarNombre("  PINTURAS   del  Norte "));
    }

    @Test
    @DisplayName("Editar actualiza los datos y la modificación, y conserva la creación")
    void editar() {
        Proveedor p = Datos.proveedor("Tornillos SA");
        p.editar("Tornillos y Más", null, "ventas@tornillos.co", "Av. 1", "admin2", Datos.AHORA.plusSeconds(10));
        assertEquals("Tornillos y Más", p.getNombre());
        assertNull(p.getTelefono());
        assertEquals("admin", p.getAuditoria().creadoPor());
        assertEquals("admin2", p.getAuditoria().modificadoPor());
    }
}
