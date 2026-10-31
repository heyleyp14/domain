package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Compra a un proveedor. Conserva el proveedor, la fecha y quién la registró para poder consultarla después; al
 * confirmarla, el stock de cada producto aumenta (eso lo hace el caso de uso, en la misma transacción).
 */
public class Compra {

    public static final int LINEAS_MAXIMAS = 100;

    private final Long id;
    private final long proveedorId;
    private final LocalDate fecha;
    private final String registradaPor;
    private final Instant registradaEn;
    private final List<LineaCompra> lineas;

    private Compra(Long id, long proveedorId, LocalDate fecha, String registradaPor, Instant registradaEn, List<LineaCompra> lineas) {
        this.id = id;
        this.proveedorId = proveedorId;
        this.fecha = fecha;
        this.registradaPor = registradaPor;
        this.registradaEn = registradaEn;
        this.lineas = List.copyOf(lineas);
    }

    public static Compra registrar(long proveedorId, LocalDate fecha, LocalDate hoy, String usuario, Instant ahora,
                                   List<LineaCompra> lineas) {
        if (lineas == null || lineas.isEmpty()) {
            throw new ValorInvalidoException("La compra necesita al menos un producto");
        }
        if (lineas.size() > LINEAS_MAXIMAS) {
            throw new ValorInvalidoException("Una compra admite hasta " + LINEAS_MAXIMAS + " productos distintos");
        }
        if (fecha.isAfter(hoy)) {
            throw new ValorInvalidoException("La fecha de la compra no puede ser futura");
        }
        Set<String> vistos = new HashSet<>();
        for (LineaCompra l : lineas) {
            if (!vistos.add(l.codigoProducto())) {
                throw new ValorInvalidoException("El producto " + l.codigoProducto() + " está repetido en la compra");
            }
        }
        return new Compra(null, proveedorId, fecha, usuario, ahora, lineas);
    }

    public static Compra reconstruir(Long id, long proveedorId, LocalDate fecha, String registradaPor, Instant registradaEn,
                                     List<LineaCompra> lineas) {
        return new Compra(id, proveedorId, fecha, registradaPor, registradaEn, lineas);
    }

    public Dinero total() { return lineas.stream().map(LineaCompra::total).reduce(Dinero.CERO, Dinero::sumar); }

    /** Código consultable: CMP-000123. */
    public String codigo() { return codigoDe(id); }

    public static String codigoDe(Long id) { return String.format(Locale.ROOT, "CMP-%06d", id == null ? 0 : id); }

    /** Lee «CMP-000123» (o «123») y devuelve el id; cualquier otra cosa es un error de validación. */
    public static long leerCodigo(String texto) {
        String t = texto == null ? "" : texto.trim().toUpperCase(Locale.ROOT);
        if (t.startsWith("CMP-")) t = t.substring(4);
        try {
            long id = Long.parseLong(t);
            if (id < 1) throw new NumberFormatException();
            return id;
        } catch (NumberFormatException e) {
            throw new ValorInvalidoException("Código de compra inválido: use el formato CMP-000123");
        }
    }

    public Long getId() { return id; }
    public long getProveedorId() { return proveedorId; }
    public LocalDate getFecha() { return fecha; }
    public String getRegistradaPor() { return registradaPor; }
    public Instant getRegistradaEn() { return registradaEn; }
    public List<LineaCompra> getLineas() { return lineas; }
}
