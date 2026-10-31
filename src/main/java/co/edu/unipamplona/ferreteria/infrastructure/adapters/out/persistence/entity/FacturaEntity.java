package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity;

import co.edu.unipamplona.ferreteria.domain.model.EstadoFactura;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "facturas", uniqueConstraints = @UniqueConstraint(name = "uk_factura_numero", columnNames = "numero"))
public class FacturaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String numero;

    @Column(nullable = false)
    private Instant fecha;

    @Column(nullable = false, length = 100)
    private String clienteNombre;

    @Column(length = 150)
    private String clienteDireccion;

    @Column(length = 30)
    private String clienteTelefono;

    @Column(nullable = false, length = 100)
    private String vendedor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoFactura estado;

    @Column(length = 100)
    private String anuladaPor;

    private Instant anuladaEn;

    @Column(length = 300)
    private String motivoAnulacion;

    @OneToMany(mappedBy = "factura", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("posicion ASC")
    private List<LineaFacturaEntity> lineas = new ArrayList<>();

    public FacturaEntity() { }

    public void agregarLinea(LineaFacturaEntity linea) {
        linea.setFactura(this);
        lineas.add(linea);
    }

    public Long getId() { return id; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public Instant getFecha() { return fecha; }
    public void setFecha(Instant fecha) { this.fecha = fecha; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteDireccion() { return clienteDireccion; }
    public void setClienteDireccion(String clienteDireccion) { this.clienteDireccion = clienteDireccion; }
    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }
    public String getVendedor() { return vendedor; }
    public void setVendedor(String vendedor) { this.vendedor = vendedor; }
    public EstadoFactura getEstado() { return estado; }
    public void setEstado(EstadoFactura estado) { this.estado = estado; }
    public String getAnuladaPor() { return anuladaPor; }
    public void setAnuladaPor(String anuladaPor) { this.anuladaPor = anuladaPor; }
    public Instant getAnuladaEn() { return anuladaEn; }
    public void setAnuladaEn(Instant anuladaEn) { this.anuladaEn = anuladaEn; }
    public String getMotivoAnulacion() { return motivoAnulacion; }
    public void setMotivoAnulacion(String motivoAnulacion) { this.motivoAnulacion = motivoAnulacion; }
    public List<LineaFacturaEntity> getLineas() { return lineas; }
}
