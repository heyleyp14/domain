package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Consecutivo anual de facturas. La fila del año se bloquea al tomar el siguiente número. */
@Entity
@Table(name = "numeracion_factura")
public class NumeracionFacturaEntity {

    @Id
    @Column(name = "anio", nullable = false)
    private int anio;

    @Column(name = "ultimo", nullable = false)
    private long ultimo;

    protected NumeracionFacturaEntity() {
    }

    public NumeracionFacturaEntity(int anio, long ultimo) {
        this.anio = anio;
        this.ultimo = ultimo;
    }

    public int getAnio() {
        return anio;
    }

    public long getUltimo() {
        return ultimo;
    }

    public long incrementar() {
        this.ultimo = this.ultimo + 1;
        return this.ultimo;
    }
}
