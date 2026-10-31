package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper;

import co.edu.unipamplona.ferreteria.domain.model.Auditoria;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.entity.ProveedorEntity;
import org.springframework.stereotype.Component;

@Component
public class ProveedorMapper {

    public ProveedorEntity aEntidad(Proveedor p) {
        ProveedorEntity e = new ProveedorEntity();
        actualizar(e, p);
        return e;
    }

    public void actualizar(ProveedorEntity e, Proveedor p) {
        e.setNombre(p.getNombre());
        e.setNombreNormalizado(Proveedor.normalizarNombre(p.getNombre()));
        e.setTelefono(p.getTelefono());
        e.setCorreo(p.getCorreo());
        e.setDireccion(p.getDireccion());
        e.setCreadoPor(p.getAuditoria().creadoPor());
        e.setCreadoEn(p.getAuditoria().creadoEn());
        e.setModificadoPor(p.getAuditoria().modificadoPor());
        e.setModificadoEn(p.getAuditoria().modificadoEn());
    }

    public Proveedor aDominio(ProveedorEntity e) {
        return Proveedor.reconstruir(e.getId(), e.getNombre(), e.getTelefono(), e.getCorreo(), e.getDireccion(),
                new Auditoria(e.getCreadoPor(), e.getCreadoEn(), e.getModificadoPor(), e.getModificadoEn()));
    }
}
