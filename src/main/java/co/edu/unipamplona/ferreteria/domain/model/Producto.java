package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.EstadoInvalidoException;
import co.edu.unipamplona.ferreteria.domain.exception.StockInsuficienteException;
import co.edu.unipamplona.ferreteria.domain.exception.StockInsuficienteException.Faltante;
import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Un producto del catálogo. Se identifica por su código/referencia único. El stock solo cambia por una venta, una
 * compra o una anulación: editar el producto no toca el inventario, para que el stock siempre tenga una causa registrada.
 */
public class Producto {

    /** Con 5 unidades o menos el producto se marca como «stock bajo». */
    public static final int UMBRAL_STOCK_BAJO = 5;
    private static final Pattern CODIGO = Pattern.compile("[A-Z0-9-]{2,20}");
    private static final BigDecimal PRECIO_MAXIMO = new BigDecimal("999999999.99");
    private static final int STOCK_MAXIMO = 1_000_000;

    private final Long id;
    private String codigo;
    private String nombre;
    private Dinero precioBase;
    private boolean aplicaIva;
    private int stock;
    private long proveedorId;
    private UnidadMedida unidadMedida;
    private boolean activo;
    private Auditoria auditoria;

    private Producto(Long id, String codigo, String nombre, Dinero precioBase, boolean aplicaIva, int stock, long proveedorId,
                     UnidadMedida unidadMedida, boolean activo, Auditoria auditoria) {
        this.id = id;
        this.codigo = codigo;
        this.nombre = nombre;
        this.precioBase = precioBase;
        this.aplicaIva = aplicaIva;
        this.stock = stock;
        this.proveedorId = proveedorId;
        this.unidadMedida = unidadMedida == null ? UnidadMedida.UNIDAD : unidadMedida;
        this.activo = activo;
        this.auditoria = auditoria;
    }

    public static Producto registrar(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva, Integer stockInicial,
                                     Long proveedorId, String usuario, Instant ahora) {
        return registrar(codigo, nombre, precioBase, aplicaIva, stockInicial, proveedorId, null, usuario, ahora);
    }

    public static Producto registrar(String codigo, String nombre, BigDecimal precioBase, Boolean aplicaIva, Integer stockInicial,
                                     Long proveedorId, String unidadMedida, String usuario, Instant ahora) {
        return new Producto(null, normalizarCodigo(codigo), nombre(nombre), precio(precioBase), aplicaIva(aplicaIva),
                stockInicial(stockInicial), proveedor(proveedorId), UnidadMedida.deRegistro(unidadMedida), true,
                Auditoria.creada(usuario, ahora));
    }

    public static Producto reconstruir(Long id, String codigo, String nombre, Dinero precioBase, boolean aplicaIva, int stock,
                                       long proveedorId, boolean activo, Auditoria auditoria) {
        return reconstruir(id, codigo, nombre, precioBase, aplicaIva, stock, proveedorId, UnidadMedida.UNIDAD, activo, auditoria);
    }

    public static Producto reconstruir(Long id, String codigo, String nombre, Dinero precioBase, boolean aplicaIva, int stock,
                                       long proveedorId, UnidadMedida unidadMedida, boolean activo, Auditoria auditoria) {
        return new Producto(id, codigo, nombre, precioBase, aplicaIva, stock, proveedorId, unidadMedida, activo, auditoria);
    }

    public static String normalizarCodigo(String c) {
        String limpio = c == null ? "" : c.trim().toUpperCase(Locale.ROOT);
        if (!CODIGO.matcher(limpio).matches()) {
            throw new ValorInvalidoException("El código debe tener de 2 a 20 caracteres (letras, números o guion)");
        }
        return limpio;
    }

    private static String nombre(String n) {
        return Contacto.obligatorio(n, "El nombre del producto", 2, 100);
    }

    private static Dinero precio(BigDecimal p) {
        if (p == null) throw new ValorInvalidoException("El precio es obligatorio");
        if (p.signum() <= 0) throw new ValorInvalidoException("El precio debe ser mayor que cero");
        if (p.compareTo(PRECIO_MAXIMO) > 0) throw new ValorInvalidoException("El precio no puede superar 999.999.999,99");
        return Dinero.de(p);
    }

    private static boolean aplicaIva(Boolean a) {
        if (a == null) throw new ValorInvalidoException("Indique si el producto aplica IVA");
        return a;
    }

    private static int stockInicial(Integer s) {
        if (s == null) throw new ValorInvalidoException("El stock inicial es obligatorio");
        if (s < 0) throw new ValorInvalidoException("El stock no puede ser negativo");
        if (s > STOCK_MAXIMO) throw new ValorInvalidoException("El stock no puede superar " + STOCK_MAXIMO + " unidades");
        return s;
    }

    private static long proveedor(Long id) {
        if (id == null || id < 1) throw new ValorInvalidoException("El proveedor es obligatorio");
        return id;
    }

    /** Edita los datos comerciales. El código y el stock no cambian por aquí. */
    public void editar(String nombre, BigDecimal precioBase, Boolean aplicaIva, Long proveedorId, String usuario, Instant ahora) {
        editar(nombre, precioBase, aplicaIva, proveedorId, null, usuario, ahora);
    }

    public void editar(String nombre, BigDecimal precioBase, Boolean aplicaIva, Long proveedorId, String unidadMedida,
                       String usuario, Instant ahora) {
        String n = nombre(nombre);
        Dinero p = precio(precioBase);
        boolean i = aplicaIva(aplicaIva);
        long prov = proveedor(proveedorId);
        UnidadMedida u = unidadMedida == null || unidadMedida.isBlank()
                ? this.unidadMedida
                : UnidadMedida.desde(unidadMedida);
        this.nombre = n;
        this.precioBase = p;
        this.aplicaIva = i;
        this.proveedorId = prov;
        this.unidadMedida = u;
        this.auditoria = auditoria.modificada(usuario, ahora);
    }

    public void desactivar(String usuario, Instant ahora) {
        if (!activo) throw new EstadoInvalidoException("El producto " + codigo + " ya estaba desactivado");
        activo = false;
        auditoria = auditoria.modificada(usuario, ahora);
    }

    public void activar(String usuario, Instant ahora) {
        if (activo) throw new EstadoInvalidoException("El producto " + codigo + " ya estaba activo");
        activo = true;
        auditoria = auditoria.modificada(usuario, ahora);
    }

    /** Solo se vende un producto activo (los desactivados conservan su historial pero salen de la venta). */
    public void asegurarVendible() { asegurarActivo("vender"); }

    /** Un producto desactivado no admite ventas ni compras; {@code accion} dice cuál se intentó. */
    public void asegurarActivo(String accion) {
        if (!activo) throw new EstadoInvalidoException("El producto " + codigo + " está desactivado y no se puede " + accion);
    }

    public boolean alcanza(int cantidad) { return stock >= cantidad; }

    /** Descuenta lo vendido. Nunca deja el stock negativo: la verificación previa informa todos los faltantes. */
    public void descontar(int cantidad, String usuario, Instant ahora) {
        if (cantidad < 1) throw new ValorInvalidoException("La cantidad a descontar debe ser mayor que cero");
        if (!alcanza(cantidad)) {
            throw new StockInsuficienteException(List.of(new Faltante(codigo, nombre, stock, cantidad)));
        }
        stock -= cantidad;
        auditoria = auditoria.modificada(usuario, ahora);
    }

    /** Aumenta por una compra o porque se anuló una venta. */
    public void reponer(int cantidad, String usuario, Instant ahora) {
        if (cantidad < 1) throw new ValorInvalidoException("La cantidad a reponer debe ser mayor que cero");
        if ((long) stock + cantidad > STOCK_MAXIMO) {
            throw new ValorInvalidoException("El stock de " + codigo + " no puede superar " + STOCK_MAXIMO + " unidades");
        }
        stock += cantidad;
        auditoria = auditoria.modificada(usuario, ahora);
    }

    /** Precio final = precio base + IVA (si aplica), con 2 decimales. */
    public Dinero precioFinal() {
        return aplicaIva ? precioBase.sumar(Iva.sobre(precioBase)) : precioBase;
    }

    public boolean stockBajo() { return stock <= UMBRAL_STOCK_BAJO; }

    public Long getId() { return id; }
    public String getCodigo() { return codigo; }
    public String getNombre() { return nombre; }
    public Dinero getPrecioBase() { return precioBase; }
    public boolean isAplicaIva() { return aplicaIva; }
    public int getStock() { return stock; }
    public long getProveedorId() { return proveedorId; }
    public UnidadMedida getUnidadMedida() { return unidadMedida; }
    public boolean isActivo() { return activo; }
    public Auditoria getAuditoria() { return auditoria; }
}
