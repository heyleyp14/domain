package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.time.Instant;
import java.util.Locale;

/**
 * Quien le vende a la ferretería. Se identifica por su nombre (único sin distinguir mayúsculas ni espacios repetidos)
 * y debe tener al menos un dato de contacto: teléfono o correo.
 */
public class Proveedor {

    private final Long id;
    private String nombre;
    private String telefono;
    private String correo;
    private String direccion;
    private Auditoria auditoria;

    private Proveedor(Long id, String nombre, String telefono, String correo, String direccion, Auditoria auditoria) {
        this.id = id;
        this.nombre = nombre;
        this.telefono = telefono;
        this.correo = correo;
        this.direccion = direccion;
        this.auditoria = auditoria;
    }

    public static Proveedor registrar(String nombre, String telefono, String correo, String direccion, String usuario, Instant ahora) {
        Proveedor p = new Proveedor(null, null, null, null, null, Auditoria.creada(usuario, ahora));
        p.asignar(nombre, telefono, correo, direccion);
        return p;
    }

    public static Proveedor reconstruir(Long id, String nombre, String telefono, String correo, String direccion, Auditoria auditoria) {
        return new Proveedor(id, nombre, telefono, correo, direccion, auditoria);
    }

    public void editar(String nombre, String telefono, String correo, String direccion, String usuario, Instant ahora) {
        asignar(nombre, telefono, correo, direccion);
        this.auditoria = auditoria.modificada(usuario, ahora);
    }

    private void asignar(String nombre, String telefono, String correo, String direccion) {
        String n = Contacto.obligatorio(nombre, "El nombre del proveedor", 2, 100);
        String t = Contacto.telefonoOpcional(telefono);
        String c = Contacto.correoOpcional(correo);
        if (t == null && c == null) {
            throw new ValorInvalidoException("El proveedor necesita al menos un dato de contacto: teléfono o correo");
        }
        this.nombre = n;
        this.telefono = t;
        this.correo = c;
        this.direccion = Contacto.opcional(direccion, "La dirección", 150);
    }

    /** Clave de unicidad: sin mayúsculas ni espacios repetidos. */
    public static String normalizarNombre(String nombre) {
        return nombre == null ? "" : nombre.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getTelefono() { return telefono; }
    public String getCorreo() { return correo; }
    public String getDireccion() { return direccion; }
    public Auditoria getAuditoria() { return auditoria; }
}
