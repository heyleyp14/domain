package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "productos", uniqueConstraints = @UniqueConstraint(name = "uk_producto_codigo", columnNames = "codigo"))
public class ProductoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String codigo;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal precioBase;

    @Column(nullable = false)
    private boolean aplicaIva;

    @Column(nullable = false)
    private int stock;

    @Column(nullable = false)
    private long proveedorId;

    @Column(nullable = false)
    private boolean activo;

    @Column(nullable = false, length = 100)
    private String creadoPor;

    @Column(nullable = false)
    private Instant creadoEn;

    @Column(nullable = false, length = 100)
    private String modificadoPor;

    @Column(nullable = false)
    private Instant modificadoEn;

    /** Segunda defensa contra la concurrencia: si dos ventas leen el mismo stock, una falla al guardar. */
    @Version
    private long version;

    public ProductoEntity() { }

    public Long getId() { return id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getPrecioBase() { return precioBase; }
    public void setPrecioBase(BigDecimal precioBase) { this.precioBase = precioBase; }
    public boolean isAplicaIva() { return aplicaIva; }
    public void setAplicaIva(boolean aplicaIva) { this.aplicaIva = aplicaIva; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public long getProveedorId() { return proveedorId; }
    public void setProveedorId(long proveedorId) { this.proveedorId = proveedorId; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public String getCreadoPor() { return creadoPor; }
    public void setCreadoPor(String creadoPor) { this.creadoPor = creadoPor; }
    public Instant getCreadoEn() { return creadoEn; }
    public void setCreadoEn(Instant creadoEn) { this.creadoEn = creadoEn; }
    public String getModificadoPor() { return modificadoPor; }
    public void setModificadoPor(String modificadoPor) { this.modificadoPor = modificadoPor; }
    public Instant getModificadoEn() { return modificadoEn; }
    public void setModificadoEn(Instant modificadoEn) { this.modificadoEn = modificadoEn; }
    public long getVersion() { return version; }
}
