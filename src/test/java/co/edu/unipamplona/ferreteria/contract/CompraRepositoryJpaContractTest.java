package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.CompraRepositoryAdapter;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.CompraMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;

@DataJpaTest
@Import({CompraRepositoryAdapter.class, CompraMapper.class})
class CompraRepositoryJpaContractTest extends CompraRepositoryContractTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private CompraRepositoryAdapter adapter;

    @BeforeEach
    void limpiarBase() {
        LimpiezaBaseDatos.limpiar(dataSource);
    }

    @Override
    protected CompraRepositoryPort repo() {
        return adapter;
    }
}
