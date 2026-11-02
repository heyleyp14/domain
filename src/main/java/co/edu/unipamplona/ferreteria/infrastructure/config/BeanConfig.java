package co.edu.unipamplona.ferreteria.infrastructure.config;

import co.edu.unipamplona.ferreteria.application.port.out.AlmacenPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.NumeracionFacturaPort;
import co.edu.unipamplona.ferreteria.application.port.out.DataCleanupPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.TransaccionPort;
import co.edu.unipamplona.ferreteria.application.service.CatalogoService;
import co.edu.unipamplona.ferreteria.application.service.ComparacionPreciosService;
import co.edu.unipamplona.ferreteria.application.service.CompraService;
import co.edu.unipamplona.ferreteria.application.service.ReporteVentasService;
import co.edu.unipamplona.ferreteria.application.port.in.SeedUseCase;
import co.edu.unipamplona.ferreteria.application.service.SeedService;
import co.edu.unipamplona.ferreteria.application.service.VentaService;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Raíz de composición. El dominio y la aplicación no llevan anotaciones de Spring (inversión de dependencias):
 * esta clase, en el borde, los construye y les entrega sus dependencias.
 */
@Configuration
public class BeanConfig {

    @Bean
    Clock reloj(@Value("${ferreteria.zona-horaria}") String zona) {
        return Clock.system(ZoneId.of(zona));
    }

    @Bean
    DatosNegocio datosNegocio(@Value("${ferreteria.negocio.nombre}") String nombre, @Value("${ferreteria.negocio.ciudad}") String ciudad,
                              @Value("${ferreteria.negocio.direccion}") String direccion,
                              @Value("${ferreteria.negocio.telefono}") String telefono,
                              @Value("${ferreteria.negocio.identificacion}") String identificacion) {
        return new DatosNegocio(nombre, ciudad, direccion, telefono, identificacion);
    }

    @Bean
    PoliticaAcceso politicaAcceso() {
        return new PoliticaAcceso();
    }

    @Bean
    CatalogoService catalogoService(ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos, TransaccionPort transaccion,
                                    Clock reloj, PoliticaAcceso acceso) {
        return new CatalogoService(proveedores, productos, transaccion, reloj, acceso);
    }

    @Bean
    VentaService ventaService(FacturaRepositoryPort facturas, ProductoRepositoryPort productos, NumeracionFacturaPort numeracion,
                              GeneradorPdfPort pdf, AlmacenPdfPort almacenPdf, DatosNegocio negocio,
                              TransaccionPort transaccion, Clock reloj, PoliticaAcceso acceso) {
        return new VentaService(facturas, productos, numeracion, pdf, almacenPdf, negocio, transaccion, reloj, acceso);
    }

    @Bean
    CompraService compraService(CompraRepositoryPort compras, ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos,
                                TransaccionPort transaccion, Clock reloj, PoliticaAcceso acceso) {
        return new CompraService(compras, proveedores, productos, transaccion, reloj, acceso);
    }

    @Bean
    ComparacionPreciosService comparacionPreciosService(CompraRepositoryPort compras, ProveedorRepositoryPort proveedores,
                                                        ProductoRepositoryPort productos, PoliticaAcceso acceso) {
        return new ComparacionPreciosService(compras, proveedores, productos, acceso);
    }

    @Bean
    ReporteVentasService reporteVentasService(FacturaRepositoryPort facturas, GeneradorPdfPort pdf, DatosNegocio negocio, Clock reloj,
                                              PoliticaAcceso acceso) {
        return new ReporteVentasService(facturas, pdf, negocio, reloj, acceso);
    }

    @Bean
    SeedUseCase seedUseCase(ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos,
                            CompraRepositoryPort compras, FacturaRepositoryPort facturas,
                            NumeracionFacturaPort numeracion, DataCleanupPort cleanup,
                            GeneradorPdfPort pdf, AlmacenPdfPort almacenPdf, DatosNegocio negocio,
                            TransaccionPort transaccion, PoliticaAcceso acceso, Clock reloj) {
        return new SeedService(proveedores, productos, compras, facturas, numeracion, cleanup,
                pdf, almacenPdf, negocio, transaccion, acceso, reloj);
    }
}
