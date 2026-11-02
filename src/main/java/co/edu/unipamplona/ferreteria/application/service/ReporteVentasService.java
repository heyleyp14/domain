package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.DocumentoPdf;
import co.edu.unipamplona.ferreteria.application.port.in.ReporteDiarioPaginado;
import co.edu.unipamplona.ferreteria.application.port.in.ReporteVentasUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.Fechas;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.TendenciaVentas;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import co.edu.unipamplona.ferreteria.domain.service.ReporteDiarioService;
import co.edu.unipamplona.ferreteria.domain.service.TendenciaVentasService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Cierre diario: el «día» es el de la zona horaria del negocio (America/Bogota), no el de UTC. */
public class ReporteVentasService implements ReporteVentasUseCase {

    /** Tope de la serie: la gráfica ofrece 7, 30 y 90 días. */
    public static final int MAXIMO_DIAS_TENDENCIA = 90;

    private final FacturaRepositoryPort facturas;
    private final GeneradorPdfPort pdf;
    private final DatosNegocio negocio;
    private final Clock reloj;
    private final PoliticaAcceso acceso;
    private final ReporteDiarioService armador = new ReporteDiarioService();
    private final TendenciaVentasService armadorTendencia = new TendenciaVentasService();

    public ReporteVentasService(FacturaRepositoryPort facturas, GeneradorPdfPort pdf, DatosNegocio negocio, Clock reloj,
                                PoliticaAcceso acceso) {
        this.facturas = facturas;
        this.pdf = pdf;
        this.negocio = negocio;
        this.reloj = reloj;
        this.acceso = acceso;
    }

    @Override
    public ReporteDiario diario(Actor actor, String fecha) {
        acceso.asegurarAdmin(actor, "consultar el reporte de ventas");
        Validacion.exigir("fecha", fecha);
        LocalDate dia = Fechas.leer(fecha, "fecha del reporte");
        ZoneId zona = reloj.getZone();
        Instant desde = dia.atStartOfDay(zona).toInstant();
        Instant hasta = dia.plusDays(1).atStartOfDay(zona).toInstant();
        return armador.construir(dia, facturas.buscarEmitidasEntre(desde, hasta));
    }

    @Override
    public ReporteDiarioPaginado diario(Actor actor, String fecha, Paginacion productos, Paginacion facturas) {
        ReporteDiario r = diario(actor, fecha);
        return new ReporteDiarioPaginado(r, Pagina.de(r.productos(), productos), Pagina.de(r.facturas(), facturas));
    }

    @Override
    public DocumentoPdf pdf(Actor actor, String fecha) {
        ReporteDiario r = diario(actor, fecha);
        return new DocumentoPdf("reporte-ventas-" + r.fecha() + ".pdf", pdf.reporteDiario(r, negocio));
    }

    @Override
    public TendenciaVentas tendencia(Actor actor, int dias) {
        acceso.asegurarAdmin(actor, "consultar la tendencia de ventas");
        if (dias < 1 || dias > MAXIMO_DIAS_TENDENCIA) {
            throw new ValorInvalidoException("El rango de la tendencia debe estar entre 1 y " + MAXIMO_DIAS_TENDENCIA + " días");
        }
        ZoneId zona = reloj.getZone();
        LocalDate hasta = LocalDate.now(reloj);
        LocalDate desde = hasta.minusDays(dias - 1L);
        Instant inicio = desde.atStartOfDay(zona).toInstant();
        Instant fin = hasta.plusDays(1).atStartOfDay(zona).toInstant();
        return armadorTendencia.construir(desde, hasta, zona, facturas.buscarEmitidasEntre(inicio, fin));
    }
}
