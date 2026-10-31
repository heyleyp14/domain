package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.ProductoRepositoryAdapter;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.ProductoMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;

@DataJpaTest
@Import({ProductoRepositoryAdapter.class, ProductoMapper.class})
class ProductoRepositoryJpaContractTest extends ProductoRepositoryContractTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private ProductoRepositoryAdapter adapter;

    @BeforeEach
    void limpiarBase() {
        LimpiezaBaseDatos.limpiar(dataSource);
    }

    @Override
    protected ProductoRepositoryPort repo() {
        return adapter;
    }
}
