package co.edu.unipamplona.ferreteria.application.port.out;

import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Puerto de salida de proveedores. */
public interface ProveedorRepositoryPort {

    Proveedor guardar(Proveedor proveedor);

    Optional<Proveedor> buscarPorId(long id);

    /** Busca por nombre ya normalizado (minúsculas y sin espacios repetidos). */
    Optional<Proveedor> buscarPorNombre(String nombreNormalizado);

    List<Proveedor> buscarPorIds(Collection<Long> ids);

    List<Proveedor> buscar(String texto);
}
