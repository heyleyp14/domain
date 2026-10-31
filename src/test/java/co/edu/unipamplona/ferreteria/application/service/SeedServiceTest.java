package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.SeedResult;
import co.edu.unipamplona.ferreteria.application.port.in.SeedUseCase;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.CompraJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.FacturaJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.NumeracionFacturaJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.ProductoJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.ProveedorJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifica que el seed borra todo lo existente y crea 20 registros por entidad. */
@SpringBootTest
class SeedServiceTest {

    @Autowired
    private SeedUseCase seed;

    @Autowired
    private ProveedorJpaRepository proveedorJpa;
    @Autowired
    private ProductoJpaRepository productoJpa;
    @Autowired
    private CompraJpaRepository compraJpa;
    @Autowired
    private FacturaJpaRepository facturaJpa;
    @Autowired
    private NumeracionFacturaJpaRepository numeracionJpa;

    @Test
    void ejecutarSeedInserta20RegistrosPorEntidad() {
        SeedResult result = seed.ejecutar();

        // Cantidades devueltas
        assertThat(result.proveedores()).isEqualTo(20);
        assertThat(result.productos()).isEqualTo(20);
        assertThat(result.compras()).isEqualTo(20);
        assertThat(result.facturas()).isEqualTo(20);

        // Registros en la base
        assertThat(proveedorJpa.count()).isEqualTo(20);
        assertThat(productoJpa.count()).isEqualTo(20);
        assertThat(compraJpa.count()).isEqualTo(20);
        assertThat(facturaJpa.count()).isEqualTo(20);
    }

    @Test
    void ejecutarSeedVuelveIdempotente() {
        seed.ejecutar();
        SeedResult segundo = seed.ejecutar();

        assertThat(segundo.proveedores()).isEqualTo(20);
        assertThat(segundo.productos()).isEqualTo(20);
        assertThat(segundo.compras()).isEqualTo(20);
        assertThat(segundo.facturas()).isEqualTo(20);

        assertThat(proveedorJpa.count()).isEqualTo(20);
        assertThat(productoJpa.count()).isEqualTo(20);
        assertThat(compraJpa.count()).isEqualTo(20);
        assertThat(facturaJpa.count()).isEqualTo(20);
        // El seed consume numeración 20 veces: una fila por año 2026 con ultimo=20.
        assertThat(numeracionJpa.count()).isEqualTo(1);
        assertThat(numeracionJpa.findById(2026)).isPresent();
        assertThat(numeracionJpa.findById(2026).get().getUltimo()).isEqualTo(20L);
    }
}
