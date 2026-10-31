package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.application.port.in.CompraUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.ConsultarComprasQuery;
import co.edu.unipamplona.ferreteria.application.port.in.command.ItemCompraCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.RegistrarCompraCommand;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Peticiones;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.CompraR;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Compras a proveedores: solo ADMIN (la regla la aplica el caso de uso; la configuración de seguridad es la primera barrera). */
@RestController
@RequestMapping("/api/compras")
public class CompraController {

    private final CompraUseCase compras;

    public CompraController(CompraUseCase compras) {
        this.compras = compras;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompraR registrar(@RequestBody Peticiones.Compra p) {
        List<ItemCompraCommand> items = p.items() == null ? null
                : p.items().stream().map(i -> new ItemCompraCommand(i == null ? null : i.codigo(), i == null ? null : i.cantidad(),
                        i == null ? null : i.precioCompra())).toList();
        return CompraR.de(compras.registrar(ActorActual.obtener(), new RegistrarCompraCommand(p.proveedorId(), p.fecha(), items)));
    }

    @GetMapping("/{codigo}")
    public CompraR consultar(@PathVariable String codigo) {
        return CompraR.de(compras.consultar(ActorActual.obtener(), codigo));
    }

    @GetMapping
    public List<CompraR> listar(@RequestParam(required = false) Long proveedorId, @RequestParam(required = false) String desde,
                                @RequestParam(required = false) String hasta, @RequestParam(required = false) String producto) {
        return compras.listar(ActorActual.obtener(), new ConsultarComprasQuery(proveedorId, desde, hasta, producto))
                .stream().map(CompraR::de).toList();
    }
}
