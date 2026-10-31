package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper;

import co.edu.unipamplona.ferreteria.domain.model.Auditoria;
import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.ProductoEntity;
import org.springframework.stereotype.Component;

@Component
public class ProductoMapper {

    public ProductoEntity aEntidad(Producto p) {
        ProductoEntity e = new ProductoEntity();
        e.setCodigo(p.getCodigo());
        actualizar(e, p);
        return e;
    }

    /** Copia todos los campos mutables; el adaptador lo usa sobre una entidad ya cargada para conservar @Version. */
    public void actualizar(ProductoEntity e, Producto p) {
        e.setCodigo(p.getCodigo());
        e.setNombre(p.getNombre());
        e.setPrecioBase(p.getPrecioBase().valor());
        e.setAplicaIva(p.isAplicaIva());
        e.setStock(p.getStock());
        e.setProveedorId(p.getProveedorId());
        e.setActivo(p.isActivo());
        e.setCreadoPor(p.getAuditoria().creadoPor());
        e.setCreadoEn(p.getAuditoria().creadoEn());
        e.setModificadoPor(p.getAuditoria().modificadoPor());
        e.setModificadoEn(p.getAuditoria().modificadoEn());
    }

    public Producto aDominio(ProductoEntity e) {
        return Producto.reconstruir(e.getId(), e.getCodigo(), e.getNombre(), Dinero.de(e.getPrecioBase()), e.isAplicaIva(),
                e.getStock(), e.getProveedorId(), e.isActivo(),
                new Auditoria(e.getCreadoPor(), e.getCreadoEn(), e.getModificadoPor(), e.getModificadoEn()));
    }
}
