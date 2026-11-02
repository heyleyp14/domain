package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.DocumentoPdf;
import co.edu.unipamplona.ferreteria.application.port.in.ReporteDiarioPaginado;
import co.edu.unipamplona.ferreteria.application.port.in.ReporteVentasUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.Fechas;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import co.edu.unipamplona.ferreteria.domain.service.ReporteDiarioService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Cierre diario: el «día» es el de la zona horaria del negocio (America/Bogota), no el de UTC. */
public class ReporteVentasService implements ReporteVentasUseCase {

    private final FacturaRepositoryPort facturas;
    private final GeneradorPdfPort pdf;
    private final DatosNegocio negocio;
    private final Clock reloj;
    private final PoliticaAcceso acceso;
    private final ReporteDiarioService armador = new ReporteDiarioService();

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
}
