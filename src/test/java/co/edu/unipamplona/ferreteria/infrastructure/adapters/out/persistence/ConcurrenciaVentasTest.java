package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unipamplona.ferreteria.application.port.in.VentaUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.EmitirFacturaCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.ItemVentaCommand;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.exception.EstadoInvalidoException;
import co.edu.unipamplona.ferreteria.domain.exception.StockInsuficienteException;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/** Concurrencia real sobre H2: última unidad y doble anulación. */
@SpringBootTest
@TestPropertySource(properties = "seguridad.jwt.secret-base64=" + ConcurrenciaVentasTest.SECRETO_DE_PRUEBA)
class ConcurrenciaVentasTest {

    static final String SECRETO_DE_PRUEBA =
            "dGVzdC1vbmx5LXNlY3JldC1mb3ItZmVycmV0ZXJpYS1ub3QtYS1yZWFsLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MA==";

    private static final Actor VENDEDOR = Actor.de("vendedor1", List.of("USER"));
    private static final Actor ADMIN = Actor.de("admin@murano3d.co", List.of("ADMIN"));

    @Autowired
    private VentaUseCase ventas;

    @Autowired
    private ProductoRepositoryPort productos;

    @Autowired
    private ProveedorRepositoryPort proveedores;

    @Test
    void dosVentasSimultaneasDeLaUltimaUnidadSoloUnaGana() throws Exception {
        String codigo = crearProducto(1);

        List<String> resultados = ejecutarDos(() -> {
            try {
                ventas.emitir(VENDEDOR, venta(codigo, 1));
                return "OK";
            } catch (StockInsuficienteException e) {
                return "SIN_STOCK";
            }
        });

        assertEquals(1, Collections.frequency(resultados, "OK"), resultados.toString());
        assertEquals(1, Collections.frequency(resultados, "SIN_STOCK"), resultados.toString());
        assertEquals(0, productos.buscarPorCodigo(codigo).orElseThrow().getStock());
    }

    @Test
    void dosAnulacionesSimultaneasDevuelvenElStockUnaSolaVez() throws Exception {
        String codigo = crearProducto(5);
        Factura factura = ventas.emitir(VENDEDOR, venta(codigo, 2));
        assertEquals(3, productos.buscarPorCodigo(codigo).orElseThrow().getStock());

        List<String> resultados = ejecutarDos(() -> {
            try {
                ventas.anular(ADMIN, factura.getNumero().valor(), "Motivo valido");
                return "OK";
            } catch (EstadoInvalidoException e) {
                return "ESTADO_INVALIDO";
            }
        });

        assertEquals(1, Collections.frequency(resultados, "OK"), resultados.toString());
        assertEquals(1, Collections.frequency(resultados, "ESTADO_INVALIDO"), resultados.toString());
        assertEquals(5, productos.buscarPorCodigo(codigo).orElseThrow().getStock());
    }

    private String crearProducto(int stock) {
        Proveedor proveedor = proveedores.guardar(Proveedor.registrar("Prov concurrencia " + System.nanoTime(),
                "3001234567", "proveedor@test.co", "Calle 1", "admin", Instant.now()));
        String codigo = "CONC-" + System.nanoTime();
        productos.guardar(Producto.registrar(codigo, "Producto concurrencia", new BigDecimal("1000"), false, stock,
                proveedor.getId(), "admin", Instant.now()));
        return codigo;
    }

    private static EmitirFacturaCommand venta(String codigo, int cantidad) {
        return new EmitirFacturaCommand("Cliente Concurrencia", "Calle 1", "3001234567",
                List.of(new ItemVentaCommand(codigo, cantidad)));
    }

    private static List<String> ejecutarDos(Callable<String> tarea) throws Exception {
        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch salida = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<String> envuelta = () -> {
                listos.countDown();
                salida.await();
                return tarea.call();
            };
            Future<String> primera = pool.submit(envuelta);
            Future<String> segunda = pool.submit(envuelta);
            assertTrue(listos.await(5, TimeUnit.SECONDS), "los hilos no arrancaron");
            salida.countDown();
            return List.of(primera.get(20, TimeUnit.SECONDS), segunda.get(20, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }
}
