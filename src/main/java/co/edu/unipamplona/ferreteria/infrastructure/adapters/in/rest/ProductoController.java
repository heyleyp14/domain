package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.application.port.in.CatalogoUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.ComparacionPreciosUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.BuscarProductosQuery;
import co.edu.unipamplona.ferreteria.application.port.in.command.EditarProductoCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.RegistrarProductoCommand;
import co.edu.unipamplona.ferreteria.application.port.out.Paginacion;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Peticiones;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.BusquedaProductosR;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.ComparacionR;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.Respuestas.ProductoR;
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

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final CatalogoUseCase catalogo;
    private final ComparacionPreciosUseCase comparacion;

    public ProductoController(CatalogoUseCase catalogo, ComparacionPreciosUseCase comparacion) {
        this.catalogo = catalogo;
        this.comparacion = comparacion;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductoR registrar(@RequestBody Peticiones.ProductoNuevo p) {
        return ProductoR.de(catalogo.registrarProducto(ActorActual.obtener(),
                new RegistrarProductoCommand(p.codigo(), p.nombre(), p.precioBase(), p.aplicaIva(), p.stockInicial(), p.proveedorId())));
    }

    @PutMapping("/{codigo}")
    public ProductoR editar(@PathVariable String codigo, @RequestBody Peticiones.ProductoEdicion p) {
        return ProductoR.de(catalogo.editarProducto(ActorActual.obtener(),
                new EditarProductoCommand(codigo, p.nombre(), p.precioBase(), p.aplicaIva(), p.proveedorId())));
    }

    @PostMapping("/{codigo}/desactivar")
    public ProductoR desactivar(@PathVariable String codigo) {
        return ProductoR.de(catalogo.desactivarProducto(ActorActual.obtener(), codigo));
    }

    @PostMapping("/{codigo}/activar")
    public ProductoR activar(@PathVariable String codigo) {
        return ProductoR.de(catalogo.activarProducto(ActorActual.obtener(), codigo));
    }

    @GetMapping
    public BusquedaProductosR buscar(@RequestParam(required = false) String q,
                                     @RequestParam(required = false) Boolean soloActivos,
                                     @RequestParam(required = false) Boolean bajoStock,
                                     @RequestParam(defaultValue = "1") int pagina,
                                     @RequestParam(defaultValue = "20") int tamano) {
        return BusquedaProductosR.de(catalogo.buscarProductos(ActorActual.obtener(),
                new BuscarProductosQuery(q, soloActivos, bajoStock), Paginacion.de(pagina, tamano)));
    }

    @GetMapping("/{codigo}")
    public ProductoR detalle(@PathVariable String codigo) {
        return ProductoR.de(catalogo.detalleProducto(ActorActual.obtener(), codigo));
    }

    /** Solo ADMIN: el precio que cobra cada proveedor por este producto. */
    @GetMapping("/{codigo}/comparacion-precios")
    public ComparacionR compararPrecios(@PathVariable String codigo,
                                        @RequestParam(defaultValue = "1") int pagina,
                                        @RequestParam(defaultValue = "20") int tamano) {
        return ComparacionR.de(comparacion.comparar(ActorActual.obtener(), codigo, Paginacion.de(pagina, tamano)));
    }
}
