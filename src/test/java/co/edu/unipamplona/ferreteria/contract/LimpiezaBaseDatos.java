package co.edu.unipamplona.ferreteria.contract;

import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Limpia las tablas antes de cada prueba JPA.
 *
 * <p>Los contratos abstractos declaran los métodos de prueba en la clase base, y
 * Spring resuelve {@code @Transactional} desde la clase declarante; por eso
 * {@code @DataJpaTest} en la subclase no abre una transacción de prueba para
 * métodos heredados y los datos persisten entre pruebas. La limpieza explícita
 * garantiza el aislamiento que exige el plan.</p>
 */
final class LimpiezaBaseDatos {

    private LimpiezaBaseDatos() {
    }

    static void limpiar(DataSource dataSource) {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("delete from linea_compra");
        jdbc.execute("delete from linea_factura");
        jdbc.execute("delete from compras");
        jdbc.execute("delete from facturas");
        jdbc.execute("delete from productos");
        jdbc.execute("delete from proveedores");
    }
}
