package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.DataCleanupPort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementación de {@link DataCleanupPort} en la capa de infraestructura.
 *
 * <p>Hace borrado masivo mediante native SQL y JPA batch, y es la única clase de la capa de
 * aplicación que manipula las tablas JPA.</p>
 */
@Component
public class DataCleanupAdapter implements DataCleanupPort {

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void limpiarTodo() {
        // Borrar las tablas de datos primero (con sus líneas), luego las tablas de soporte
        // (numeración, y en general cualquier otra). El orden es importante para evitar
        // violaciones de clave foránea por el cascade de las entidades.
        em.createNativeQuery("DELETE FROM linea_factura").executeUpdate();
        em.createNativeQuery("DELETE FROM linea_compra").executeUpdate();
        em.createNativeQuery("DELETE FROM numeracion_factura").executeUpdate();
        em.createNativeQuery("DELETE FROM facturas").executeUpdate();
        em.createNativeQuery("DELETE FROM compras").executeUpdate();
        em.createNativeQuery("DELETE FROM productos").executeUpdate();
        em.createNativeQuery("DELETE FROM proveedores").executeUpdate();
        em.flush();
    }
}
