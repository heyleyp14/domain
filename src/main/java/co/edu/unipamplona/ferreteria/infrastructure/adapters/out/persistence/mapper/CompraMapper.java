package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper;

import co.edu.unipamplona.ferreteria.domain.model.Compra;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.LineaCompra;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.CompraEntity;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.LineaCompraEntity;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CompraMapper {

    public CompraEntity aEntidad(Compra c) {
        CompraEntity e = new CompraEntity();
        actualizar(e, c);
        int posicion = 0;
        for (LineaCompra l : c.getLineas()) {
            LineaCompraEntity le = new LineaCompraEntity();
            le.setPosicion(posicion++);
            le.setCodigoProducto(l.codigoProducto());
            le.setNombreProducto(l.nombreProducto());
            le.setCantidad(l.cantidad());
            le.setPrecioUnitario(l.precioUnitario().valor());
            e.agregarLinea(le);
        }
        return e;
    }

    /** Las compras son inmutables: solo se copian las cabeceras (las líneas no cambian). */
    public void actualizar(CompraEntity e, Compra c) {
        e.setProveedorId(c.getProveedorId());
        e.setFecha(c.getFecha());
        e.setRegistradaPor(c.getRegistradaPor());
        e.setRegistradaEn(c.getRegistradaEn());
    }

    public Compra aDominio(CompraEntity e) {
        List<LineaCompra> lineas = e.getLineas().stream()
                .map(l -> new LineaCompra(l.getCodigoProducto(), l.getNombreProducto(), l.getCantidad(),
                        Dinero.de(l.getPrecioUnitario())))
                .toList();
        return Compra.reconstruir(e.getId(), e.getProveedorId(), e.getFecha(), e.getRegistradaPor(), e.getRegistradaEn(), lineas);
    }
}
