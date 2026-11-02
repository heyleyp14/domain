package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.SeedResult;
import co.edu.unipamplona.ferreteria.application.port.in.SeedUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.AlmacenPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.testsupport.AlmacenPdfFalso;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.CompraJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.FacturaJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.NumeracionFacturaJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.ProductoJpaRepository;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence.repository.ProveedorJpaRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifica que el seed borra todo lo existente y crea 20 registros por entidad, con datos del día. */
@SpringBootTest
class SeedServiceTest {

    @TestConfiguration
    static class AlmacenDePdfDePrueba {
        @Bean
        @Primary
        AlmacenPdfPort almacenPdfDePrueba() {
            return new AlmacenPdfFalso();
        }
    }

    @Autowired
    private SeedUseCase seed;

    @Autowired
    private FacturaRepositoryPort facturas;

    @Autowired
    private Clock reloj;

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
        assertThat(facturaJpa.findAll())
                .allMatch(f -> f.getPdfUrl() != null && f.getPdfUrl().startsWith("https://"));
    }

    @Test
    void elSeedDejaStockBajoYVentasDeHoy() {
        seed.ejecutar();

        // La tarjeta "Stock bajo" necesita productos en el umbral (stock <= 5), incluidos agotados.
        assertThat(productoJpa.findAll().stream().filter(p -> p.getStock() <= 5)).hasSize(6);
        assertThat(productoJpa.findAll().stream().filter(p -> p.getStock() == 0)).isNotEmpty();

        // "Ventas de hoy", "Más vendidos hoy" y el reporte diario necesitan facturas del día de Bogotá.
        LocalDate hoy = LocalDate.now(reloj);
        Instant desde = hoy.atStartOfDay(reloj.getZone()).toInstant();
        Instant hasta = hoy.plusDays(1).atStartOfDay(reloj.getZone()).toInstant();
        List<Factura> deHoy = facturas.buscarEmitidasEntre(desde, hasta);
        assertThat(deHoy).hasSize(7);
        assertThat(deHoy.stream().filter(Factura::estaAnulada)).hasSize(1);
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
        // El seed consume numeración 20 veces; puede haber una fila por año si la historia cruza el 31 de diciembre.
        assertThat(numeracionJpa.findAll().stream().mapToLong(n -> n.getUltimo()).sum()).isEqualTo(20L);
    }
}
