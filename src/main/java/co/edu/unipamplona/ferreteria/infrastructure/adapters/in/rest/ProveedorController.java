package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.application.port.in.CatalogoUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.EditarProveedorCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.RegistrarProveedorCommand;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Peticiones;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.ProveedorDetalleR;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.ProveedorR;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Adaptador de entrada: traduce HTTP a casos de uso. No decide permisos ni reglas de negocio. */
@RestController
@RequestMapping("/api/proveedores")
public class ProveedorController {

    private final CatalogoUseCase catalogo;

    public ProveedorController(CatalogoUseCase catalogo) {
        this.catalogo = catalogo;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProveedorR registrar(@RequestBody Peticiones.Proveedor p) {
        return ProveedorR.de(catalogo.registrarProveedor(ActorActual.obtener(),
                new RegistrarProveedorCommand(p.nombre(), p.telefono(), p.correo(), p.direccion())));
    }

    @PutMapping("/{id}")
    public ProveedorR editar(@PathVariable long id, @RequestBody Peticiones.Proveedor p) {
        return ProveedorR.de(catalogo.editarProveedor(ActorActual.obtener(),
                new EditarProveedorCommand(id, p.nombre(), p.telefono(), p.correo(), p.direccion())));
    }

    @GetMapping
    public List<ProveedorR> listar(@RequestParam(required = false) String q) {
        return catalogo.listarProveedores(ActorActual.obtener(), q).stream().map(ProveedorR::de).toList();
    }

    @GetMapping("/{id}")
    public ProveedorDetalleR detalle(@PathVariable long id) {
        return ProveedorDetalleR.de(catalogo.detalleProveedor(ActorActual.obtener(), id));
    }
}
