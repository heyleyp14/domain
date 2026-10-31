package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "compras")
public class CompraEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private long proveedorId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 100)
    private String registradaPor;

    @Column(nullable = false)
    private Instant registradaEn;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("posicion ASC")
    private List<LineaCompraEntity> lineas = new ArrayList<>();

    public CompraEntity() { }

    public void agregarLinea(LineaCompraEntity linea) {
        linea.setCompra(this);
        lineas.add(linea);
    }

    public Long getId() { return id; }
    public long getProveedorId() { return proveedorId; }
    public void setProveedorId(long proveedorId) { this.proveedorId = proveedorId; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getRegistradaPor() { return registradaPor; }
    public void setRegistradaPor(String registradaPor) { this.registradaPor = registradaPor; }
    public Instant getRegistradaEn() { return registradaEn; }
    public void setRegistradaEn(Instant registradaEn) { this.registradaEn = registradaEn; }
    public List<LineaCompraEntity> getLineas() { return lineas; }
}
