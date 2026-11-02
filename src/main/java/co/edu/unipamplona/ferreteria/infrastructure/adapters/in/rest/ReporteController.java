package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.application.port.in.ReporteVentasUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.ReporteDiarioR;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.TendenciaVentasR;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Reportes de ventas: solo ADMIN. La fecha (AAAA-MM-DD) es obligatoria: si falta, la respuesta lo dice. */
@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteVentasUseCase reportes;

    public ReporteController(ReporteVentasUseCase reportes) {
        this.reportes = reportes;
    }

    @GetMapping("/ventas-diarias")
    public ReporteDiarioR diario(@RequestParam(required = false) String fecha,
                                 @RequestParam(defaultValue = "1") int paginaProductos,
                                 @RequestParam(defaultValue = "20") int tamanoProductos,
                                 @RequestParam(defaultValue = "1") int paginaFacturas,
                                 @RequestParam(defaultValue = "20") int tamanoFacturas) {
        return ReporteDiarioR.de(reportes.diario(ActorActual.obtener(), fecha,
                Paginacion.de(paginaProductos, tamanoProductos), Paginacion.de(paginaFacturas, tamanoFacturas)));
    }

    @GetMapping("/tendencia-ventas")
    public TendenciaVentasR tendencia(@RequestParam(defaultValue = "90") int dias) {
        return TendenciaVentasR.de(reportes.tendencia(ActorActual.obtener(), dias));
    }

    @GetMapping("/ventas-diarias/pdf")
    public ResponseEntity<byte[]> pdf(@RequestParam(required = false) String fecha) {
        return FacturaController.comoPdf(reportes.pdf(ActorActual.obtener(), fecha));
    }
}
