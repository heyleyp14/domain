package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.FacturaRepositoryAdapter;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.FacturaMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;

@DataJpaTest
@Import({FacturaRepositoryAdapter.class, FacturaMapper.class})
class FacturaRepositoryJpaContractTest extends FacturaRepositoryContractTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private FacturaRepositoryAdapter adapter;

    @BeforeEach
    void limpiarBase() {
        LimpiezaBaseDatos.limpiar(dataSource);
    }

    @Override
    protected FacturaRepositoryPort repo() {
        return adapter;
    }
}
