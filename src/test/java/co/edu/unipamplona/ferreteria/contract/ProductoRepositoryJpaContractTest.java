package co.edu.unipamplona.ferreteria.contract;

import static org.junit.jupiter.api.Assertions.assertEquals;

import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.UnidadMedida;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.ProductoRepositoryAdapter;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.mapper.ProductoMapper;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.math.BigDecimal;
import java.sql.Timestamp;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@DataJpaTest
@Import({ProductoRepositoryAdapter.class, ProductoMapper.class})
class ProductoRepositoryJpaContractTest extends ProductoRepositoryContractTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private ProductoRepositoryAdapter adapter;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void limpiarBase() {
        LimpiezaBaseDatos.limpiar(dataSource);
    }

    @Override
    protected ProductoRepositoryPort repo() {
        return adapter;
    }

    @Test
    void productoExistenteSinUnidadSeLeeComoUnidad() {
        Timestamp ahora = Timestamp.from(Datos.AHORA);
        jdbc.update("""
                insert into productos (codigo, nombre, precio_base, aplica_iva, stock, proveedor_id, activo,
                                       creado_por, creado_en, modificado_por, modificado_en, version)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, "LEG-01", "Producto legado", new BigDecimal("1000.00"), true, 1, 1L, true,
                "admin", ahora, "admin", ahora, 0L);

        assertEquals("UNIDAD", jdbc.queryForObject(
                "select unidad_medida from productos where codigo = ?", String.class, "LEG-01"));
        assertEquals(UnidadMedida.UNIDAD, adapter.buscarPorCodigo("LEG-01").orElseThrow().getUnidadMedida());
    }
}
