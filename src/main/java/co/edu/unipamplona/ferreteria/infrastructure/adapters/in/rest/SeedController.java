package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.application.port.in.SeedResult;
import co.edu.unipamplona.ferreteria.application.port.in.SeedUseCase;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de seed de datos de desarrollo.
 *
 * <p>Reinicia la base (borra todo lo existente) y crea 20 registros por cada entidad principal:
 * proveedores, productos, compras y facturas.</p>
 *
 * <p>Requiere autenticación ADMIN (JWT): @see SeedService</p>
 */
@RestController
@RequestMapping("/api/seed")
public class SeedController {

    private final SeedUseCase seed;

    public SeedController(SeedUseCase seed) {
        this.seed = seed;
    }

    /**
     * Ejecuta el seed completo.
     *
     * @return cantidades insertadas de cada entidad
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SeedResult ejecutar() {
        return seed.ejecutar();
    }
}
