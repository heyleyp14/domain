package co.edu.unipamplona.ferreteria.domain;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.TendenciaVentas;
import co.edu.unipamplona.ferreteria.domain.model.VentaDiaria;
import co.edu.unipamplona.ferreteria.domain.service.TendenciaVentasService;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TendenciaVentasServiceTest {

    private final TendenciaVentasService servicio = new TendenciaVentasService();

    private static final LocalDate DESDE = LocalDate.of(2026, 10, 18);
    private static final LocalDate HASTA = LocalDate.of(2026, 10, 20);

    @Test
    @DisplayName("T3.5: la serie incluye todos los días del rango, con ceros donde no hubo ventas")
    void serieContinuaConCeros() {
        TendenciaVentas t = servicio.construir(DESDE, HASTA, Datos.BOGOTA, List.of(
                Datos.factura("FAC-2026-000001", Datos.AHORA, "Ana", false, Datos.linea("MAR-01", 2, "10000", true))));
        assertEquals(3, t.dias().size());
        assertEquals(DESDE, t.dias().get(0).fecha());
        assertEquals(HASTA, t.dias().get(2).fecha());
        assertEquals(Dinero.CERO, t.dias().get(0).total());
        assertEquals(Dinero.CERO, t.dias().get(1).total());
        assertEquals(Dinero.de("23800"), t.dias().get(2).total());
        assertEquals(1, t.dias().get(2).facturasEmitidas());
        assertEquals(2, t.dias().get(2).unidadesVendidas());
    }

    @Test
    @DisplayName("T3.5: suma total, facturas y unidades del periodo")
    void totalesDelPeriodo() {
        TendenciaVentas t = servicio.construir(DESDE, HASTA, Datos.BOGOTA, List.of(
                Datos.factura("FAC-2026-000001", Datos.AHORA, "Ana", false, Datos.linea("MAR-01", 2, "10000", true)),
                Datos.factura("FAC-2026-000002", Datos.AHORA, "Beto", false, Datos.linea("CLA-01", 5, "100", false))));
        assertEquals(Dinero.de("24300"), t.total());
        assertEquals(2, t.facturasEmitidas());
        assertEquals(7, t.unidadesVendidas());
        assertEquals(3, t.diasDelRango());
        assertFalse(t.sinVentas());
    }

    @Test
    @DisplayName("T3.5: el día es el de Bogotá; una venta de las 22:00 locales cuenta en su día, no en el UTC siguiente")
    void agrupaPorDiaDeBogota() {
        TendenciaVentas t = servicio.construir(DESDE, HASTA, Datos.BOGOTA, List.of(
                // 21 oct 03:00 UTC = 20 oct 22:00 en Bogotá
                Datos.factura("FAC-2026-000001", java.time.Instant.parse("2026-10-21T03:00:00Z"), "Noche", false,
                        Datos.linea("MAR-01", 1, "1000", false))));
        assertEquals(Dinero.de("1000"), t.dias().get(2).total());
        assertEquals(1, t.dias().get(2).facturasEmitidas());
        assertEquals(0, t.dias().get(1).facturasEmitidas());
    }

    @Test
    @DisplayName("T3.5: las anuladas y las facturas fuera del rango no suman")
    void ignoraAnuladasYFueraDeRango() {
        Factura anulada = Datos.factura("FAC-2026-000001", Datos.AHORA, "Anulada", true, Datos.linea("MAR-01", 5, "10000", true));
        Factura deAyer = Datos.factura("FAC-2026-000002", java.time.Instant.parse("2026-10-10T15:00:00Z"), "Vieja", false,
                Datos.linea("MAR-01", 3, "10000", true));
        TendenciaVentas t = servicio.construir(DESDE, HASTA, Datos.BOGOTA, List.of(anulada, deAyer));
        assertTrue(t.sinVentas());
        assertEquals(Dinero.CERO, t.total());
        assertEquals(0, t.unidadesVendidas());
    }

    @Test
    @DisplayName("T3.5: un solo día devuelve un punto")
    void unSoloDia() {
        TendenciaVentas t = servicio.construir(HASTA, HASTA, Datos.BOGOTA, List.of());
        assertEquals(1, t.dias().size());
        assertEquals(HASTA, t.dias().get(0).fecha());
        assertEquals(1, t.diasDelRango());
        assertTrue(t.sinVentas());
        assertEquals(VentaDiaria.sinVentas(HASTA), t.dias().get(0));
    }
}
