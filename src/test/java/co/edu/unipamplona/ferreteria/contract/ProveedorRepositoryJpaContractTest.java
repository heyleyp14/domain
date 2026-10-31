package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.ProveedorRepositoryAdapter;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.ProveedorMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;

@DataJpaTest
@Import({ProveedorRepositoryAdapter.class, ProveedorMapper.class})
class ProveedorRepositoryJpaContractTest extends ProveedorRepositoryContractTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private ProveedorRepositoryAdapter adapter;

    @BeforeEach
    void limpiarBase() {
        LimpiezaBaseDatos.limpiar(dataSource);
    }

    @Override
    protected ProveedorRepositoryPort repo() {
        return adapter;
    }
}
