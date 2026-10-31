package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.application.port.in.DocumentoPdf;
import co.edu.unipamplona.ferreteria.application.port.in.VentaUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.EmitirFacturaCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.ItemVentaCommand;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Peticiones;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.FacturaR;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/facturas")
public class FacturaController {

    private final VentaUseCase ventas;

    public FacturaController(VentaUseCase ventas) {
        this.ventas = ventas;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacturaR emitir(@RequestBody Peticiones.Factura p) {
        List<ItemVentaCommand> items = p.items() == null ? null
                : p.items().stream().map(i -> new ItemVentaCommand(i == null ? null : i.codigo(), i == null ? null : i.cantidad())).toList();
        return FacturaR.de(ventas.emitir(ActorActual.obtener(),
                new EmitirFacturaCommand(p.clienteNombre(), p.clienteDireccion(), p.clienteTelefono(), items)));
    }

    @GetMapping("/{numero}")
    public FacturaR consultar(@PathVariable String numero) {
        return FacturaR.de(ventas.consultar(ActorActual.obtener(), numero));
    }

    @GetMapping("/{numero}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable String numero) {
        return comoPdf(ventas.pdf(ActorActual.obtener(), numero));
    }

    /** Solo ADMIN. Devuelve el stock y deja la factura ANULADA con su motivo. */
    @PostMapping("/{numero}/anulacion")
    public FacturaR anular(@PathVariable String numero, @RequestBody Peticiones.Anulacion p) {
        return FacturaR.de(ventas.anular(ActorActual.obtener(), numero, p.motivo()));
    }

    static ResponseEntity<byte[]> comoPdf(DocumentoPdf doc) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(doc.nombreArchivo()).build().toString())
                .body(doc.contenido());
    }
}
