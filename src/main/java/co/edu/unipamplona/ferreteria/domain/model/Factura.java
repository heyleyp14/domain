package co.edu.unipamplona.ferreteria.domain.model;

import co.edu.unipamplona.ferreteria.domain.exception.EstadoInvalidoException;
import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Factura de venta (raíz de agregado). Las líneas no existen fuera de su factura y los totales se calculan a partir
 * de ellas, nunca se guardan por separado: así lo impreso y lo calculado siempre coinciden.
 */
public class Factura {

    public static final int LINEAS_MAXIMAS = 100;

    private final Long id;
    private final NumeroFactura numero;
    private final Instant fecha;
    private final String clienteNombre;
    private final String clienteDireccion;
    private final String clienteTelefono;
    private final String vendedor;
    private final List<LineaFactura> lineas;
    private EstadoFactura estado;
    private String anuladaPor;
    private Instant anuladaEn;
    private String motivoAnulacion;

    private Factura(Long id, NumeroFactura numero, Instant fecha, String clienteNombre, String clienteDireccion,
                    String clienteTelefono, String vendedor, List<LineaFactura> lineas, EstadoFactura estado,
                    String anuladaPor, Instant anuladaEn, String motivoAnulacion) {
        this.id = id;
        this.numero = numero;
        this.fecha = fecha;
        this.clienteNombre = clienteNombre;
        this.clienteDireccion = clienteDireccion;
        this.clienteTelefono = clienteTelefono;
        this.vendedor = vendedor;
        this.lineas = List.copyOf(lineas);
        this.estado = estado;
        this.anuladaPor = anuladaPor;
        this.anuladaEn = anuladaEn;
        this.motivoAnulacion = motivoAnulacion;
    }

    public static Factura emitir(NumeroFactura numero, String clienteNombre, String clienteDireccion, String clienteTelefono,
                                 String vendedor, List<LineaFactura> lineas, Instant ahora) {
        if (lineas == null || lineas.isEmpty()) {
            throw new ValorInvalidoException("La factura necesita al menos un producto");
        }
        if (lineas.size() > LINEAS_MAXIMAS) {
            throw new ValorInvalidoException("Una factura admite hasta " + LINEAS_MAXIMAS + " productos distintos");
        }
        return new Factura(null, numero, ahora,
                Contacto.obligatorio(clienteNombre, "El nombre del cliente", 2, 100),
                Contacto.opcional(clienteDireccion, "La dirección del cliente", 150),
                Contacto.telefonoOpcional(clienteTelefono),
                vendedor, new ArrayList<>(lineas), EstadoFactura.EMITIDA, null, null, null);
    }

    public static Factura reconstruir(Long id, NumeroFactura numero, Instant fecha, String clienteNombre, String clienteDireccion,
                                      String clienteTelefono, String vendedor, List<LineaFactura> lineas, EstadoFactura estado,
                                      String anuladaPor, Instant anuladaEn, String motivoAnulacion) {
        return new Factura(id, numero, fecha, clienteNombre, clienteDireccion, clienteTelefono, vendedor, lineas, estado,
                anuladaPor, anuladaEn, motivoAnulacion);
    }

    /** Anula la factura. El motivo es obligatorio y una factura no se anula dos veces. */
    public void anular(String motivo, String usuario, Instant ahora) {
        if (estado == EstadoFactura.ANULADA) {
            throw new EstadoInvalidoException("La factura " + numero + " ya está anulada");
        }
        this.motivoAnulacion = Contacto.obligatorio(motivo, "El motivo de la anulación", 5, 300);
        this.estado = EstadoFactura.ANULADA;
        this.anuladaPor = usuario;
        this.anuladaEn = ahora;
    }

    public Dinero subtotal() { return lineas.stream().map(LineaFactura::subtotal).reduce(Dinero.CERO, Dinero::sumar); }

    public Dinero iva() { return lineas.stream().map(LineaFactura::iva).reduce(Dinero.CERO, Dinero::sumar); }

    public Dinero total() { return subtotal().sumar(iva()); }

    public boolean estaAnulada() { return estado == EstadoFactura.ANULADA; }

    public Long getId() { return id; }
    public NumeroFactura getNumero() { return numero; }
    public Instant getFecha() { return fecha; }
    public String getClienteNombre() { return clienteNombre; }
    public String getClienteDireccion() { return clienteDireccion; }
    public String getClienteTelefono() { return clienteTelefono; }
    public String getVendedor() { return vendedor; }
    public List<LineaFactura> getLineas() { return lineas; }
    public EstadoFactura getEstado() { return estado; }
    public String getAnuladaPor() { return anuladaPor; }
    public Instant getAnuladaEn() { return anuladaEn; }
    public String getMotivoAnulacion() { return motivoAnulacion; }
}
