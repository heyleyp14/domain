package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper;

import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.NumeroFactura;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.FacturaEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.LineaFacturaEntity;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class FacturaMapper {

    public FacturaEntity aEntidad(Factura f) {
        FacturaEntity e = new FacturaEntity();
        e.setNumero(f.getNumero().valor());
        e.setFecha(f.getFecha());
        e.setClienteNombre(f.getClienteNombre());
        e.setClienteDireccion(f.getClienteDireccion());
        e.setClienteTelefono(f.getClienteTelefono());
        e.setVendedor(f.getVendedor());
        e.setEstado(f.getEstado());
        e.setAnuladaPor(f.getAnuladaPor());
        e.setAnuladaEn(f.getAnuladaEn());
        e.setMotivoAnulacion(f.getMotivoAnulacion());
        int posicion = 0;
        for (LineaFactura l : f.getLineas()) {
            LineaFacturaEntity le = new LineaFacturaEntity();
            le.setPosicion(posicion++);
            le.setCodigoProducto(l.codigoProducto());
            le.setNombreProducto(l.nombreProducto());
            le.setCantidad(l.cantidad());
            le.setPrecioBase(l.precioBase().valor());
            le.setAplicaIva(l.aplicaIva());
            e.agregarLinea(le);
        }
        return e;
    }

    /** Solo cambian el estado y los datos de anulación; las líneas de una factura emitida son inmutables. */
    public void actualizar(FacturaEntity e, Factura f) {
        e.setEstado(f.getEstado());
        e.setAnuladaPor(f.getAnuladaPor());
        e.setAnuladaEn(f.getAnuladaEn());
        e.setMotivoAnulacion(f.getMotivoAnulacion());
    }

    public Factura aDominio(FacturaEntity e) {
        List<LineaFactura> lineas = e.getLineas().stream()
                .map(l -> new LineaFactura(l.getCodigoProducto(), l.getNombreProducto(), l.getCantidad(),
                        Dinero.de(l.getPrecioBase()), l.isAplicaIva()))
                .toList();
        return Factura.reconstruir(e.getId(), NumeroFactura.desde(e.getNumero()), e.getFecha(), e.getClienteNombre(),
                e.getClienteDireccion(), e.getClienteTelefono(), e.getVendedor(), lineas, e.getEstado(),
                e.getAnuladaPor(), e.getAnuladaEn(), e.getMotivoAnulacion());
    }
}
