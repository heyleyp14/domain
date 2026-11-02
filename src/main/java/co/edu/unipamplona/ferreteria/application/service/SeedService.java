package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.SeedResult;
import co.edu.unipamplona.ferreteria.application.port.in.SeedUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.AlmacenPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.DatosNegocio;
import co.edu.unipamplona.ferreteria.application.port.out.GeneradorPdfPort;
import co.edu.unipamplona.ferreteria.application.port.out.TransaccionPort;
import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.DataCleanupPort;
import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.NumeracionFacturaPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import co.edu.unipamplona.ferreteria.domain.model.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Seed de datos de desarrollo: reinicia la base (borra lo existente) y crea 20 registros por entidad.
 *
 * <p>Las fechas se calculan con el reloj del negocio (America/Bogota) en el momento de ejecutar, no
 * están fijas: cada ejecución deja ventas de hoy, una historia reciente para la gráfica y compras
 * anteriores, así el inicio, el reporte diario y la tendencia siempre tienen datos. La base sí se
 * reinicia: es un reset de demostración, se ejecuta a mano con {@code POST /api/seed} o
 * {@code scripts/seed.sh}.</p>
 *
 * <p>Orden de borrado: facturas (con líneas) → compras (con líneas) → productos → proveedores →
 * numeración de facturas. Esto evita violaciones de clave foránea por el cascade de las entidades.</p>
 *
 * <p>Si Cloudinary está configurado, cada factura sembrada también genera y publica su PDF con la
 * plantilla nueva; si no, la factura queda con {@code pdfUrl} nulo y el seed igual termina.</p>
 */
public class SeedService implements SeedUseCase {

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);
    private static final int CANTIDAD = 20;
    /** Productos con stock en el umbral de "stock bajo" (0 y 0 muestran también "Agotado"). */
    private static final int[] STOCK_BAJO = {0, 0, 1, 2, 3, 5};
    /** Facturas emitidas hoy; la última se anula para llenar la tarjeta de facturas anuladas. */
    private static final int FACTURAS_HOY = 7;
    /** Compras repartidas antes de hoy: de hace 40 días a hace 21. */
    private static final int DIAS_COMPRA_MIN = 40;

    private final ProveedorRepositoryPort proveedores;
    private final ProductoRepositoryPort productos;
    private final CompraRepositoryPort compras;
    private final FacturaRepositoryPort facturas;
    private final NumeracionFacturaPort numeracion;
    private final DataCleanupPort cleanup;
    private final GeneradorPdfPort pdf;
    private final AlmacenPdfPort almacenPdf;
    private final DatosNegocio negocio;
    private final TransaccionPort transaccion;
    private final PoliticaAcceso acceso;
    private final Clock reloj;

    public SeedService(ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos,
                       CompraRepositoryPort compras, FacturaRepositoryPort facturas,
                       NumeracionFacturaPort numeracion, DataCleanupPort cleanup,
                       GeneradorPdfPort pdf, AlmacenPdfPort almacenPdf, DatosNegocio negocio,
                       TransaccionPort transaccion, PoliticaAcceso acceso, Clock reloj) {
        this.proveedores = proveedores;
        this.productos = productos;
        this.compras = compras;
        this.facturas = facturas;
        this.numeracion = numeracion;
        this.cleanup = cleanup;
        this.pdf = pdf;
        this.almacenPdf = almacenPdf;
        this.negocio = negocio;
        this.transaccion = transaccion;
        this.acceso = acceso;
        this.reloj = reloj;
    }

    /** Resetea la base y seedea 20 registros por cada entidad principal, con las fechas de hoy. */
    public SeedResult ejecutar() {
        return transaccion.ejecutar(() -> {
            acceso.asegurarAdmin(admin(), "ejecutar el seed");

            Instant ahora = reloj.instant();
            LocalDate hoy = LocalDate.now(reloj);

            resetearBase();

            List<Proveedor> proveedorList = crearProveedores(ahora);
            List<Producto> productoList = crearProductos(proveedorList, ahora);
            List<Compra> compraList = crearCompras(proveedorList, productoList, hoy, ahora);
            List<Factura> facturaList = crearFacturas(productoList, hoy, ahora);

            return SeedResult.de(proveedorList.size(), productoList.size(), compraList.size(), facturaList.size());
        });
    }

    private Actor admin() {
        return Actor.de("admin", List.of("ADMIN"));
    }

    /** Borra todas las filas en el orden correcto (respetando las relaciones de cascade). */
    private void resetearBase() {
        cleanup.limpiarTodo();
    }

    private List<Proveedor> crearProveedores(Instant ahora) {
        List<Proveedor> list = new ArrayList<>();
        for (int i = 0; i < CANTIDAD; i++) {
            String nombre = "Ferretería " + String.format("%02d", i + 1);
            Proveedor p = Proveedor.registrar(nombre,
                    "300" + (1000 + i), "proveedor" + (i + 1) + "@demo.co",
                    "Calle " + (i + 1) + " # " + (i + 1) + "-" + (i + 1),
                    "admin", ahora);
            list.add(proveedores.guardar(p));
        }
        return list;
    }

    private List<Producto> crearProductos(List<Proveedor> proveedorList, Instant ahora) {
        List<Producto> list = new ArrayList<>();
        for (int i = 0; i < CANTIDAD; i++) {
            long proveedorId = proveedorList.get(i % CANTIDAD).getId();
            int stock = i < STOCK_BAJO.length ? STOCK_BAJO[i] : 20 + (i % 40);
            Producto p = Producto.registrar("P-" + String.format("%03d", i + 1),
                    "Producto " + (i + 1), BigDecimal.valueOf(10000 + i * 100),
                    i % 2 == 0, stock, proveedorId, "admin", ahora);
            list.add(productos.guardar(p));
        }
        return list;
    }

    private List<Compra> crearCompras(List<Proveedor> proveedorList, List<Producto> productoList,
                                      LocalDate hoy, Instant ahora) {
        List<Compra> list = new ArrayList<>();
        for (int i = 0; i < CANTIDAD; i++) {
            long proveedorId = proveedorList.get(i % CANTIDAD).getId();
            LocalDate fecha = hoy.minusDays(DIAS_COMPRA_MIN - i);
            List<LineaCompra> lineas = new ArrayList<>();
            for (int j = 0; j < 3; j++) {
                int idx = (i * 3 + j) % CANTIDAD;
                Producto p = productoList.get(idx);
                lineas.add(new LineaCompra(p.getCodigo(), p.getNombre(), 10 + j,
                        Dinero.de(BigDecimal.valueOf(5000 + j * 1000))));
            }
            Compra c = Compra.registrar(proveedorId, fecha, hoy, "admin", ahora, lineas);
            list.add(compras.guardar(c));
        }
        return list;
    }

    private List<Factura> crearFacturas(List<Producto> productoList, LocalDate hoy, Instant ahora) {
        List<Factura> list = new ArrayList<>();
        ZoneId zona = reloj.getZone();
        String[] clientes = {
                "Cliente A", "Cliente B", "Cliente C", "Cliente D", "Cliente E",
                "Cliente F", "Cliente G", "Cliente H", "Cliente I", "Cliente J",
                "Cliente K", "Cliente L", "Cliente M", "Cliente N", "Cliente O",
                "Cliente P", "Cliente Q", "Cliente R", "Cliente S", "Cliente T"
        };
        for (int i = 0; i < CANTIDAD; i++) {
            // Las primeras son de hoy; el resto se reparte cada dos días hasta hace 25 días.
            int diasAtras = i < FACTURAS_HOY ? 0 : 1 + (i - FACTURAS_HOY) * 2;
            LocalDate dia = hoy.minusDays(diasAtras);
            Instant fecha = dia.atTime(8 + (i % 10), (i * 7) % 60).atZone(zona).toInstant();
            int anio = dia.getYear();
            NumeroFactura numero = NumeroFactura.de(anio, numeracion.siguienteSecuencia(anio));
            List<LineaFactura> lineas = new ArrayList<>();
            for (int j = 0; j < 3; j++) {
                int idx = (i * 3 + j) % CANTIDAD;
                Producto p = productoList.get(idx);
                lineas.add(new LineaFactura(p.getCodigo(), p.getNombre(), 2 + j,
                        Dinero.de(BigDecimal.valueOf(15000 + j * 2000)), j % 2 == 0));
            }
            Factura f = Factura.emitir(numero, clientes[i],
                    "Calle " + (i + 1) + " # 1-1", "300" + (1000 + i), "vendedor1", lineas, fecha);
            if (i == FACTURAS_HOY - 1) {
                f.anular("Error de digitación", "admin", fecha.plusSeconds(60));
            }
            list.add(publicarPdf(facturas.guardar(f)));
        }
        return list;
    }

    /**
     * Genera el PDF con la plantilla nueva y lo publica en Cloudinary. Si el almacen no esta
     * configurado o falla, la factura del seed se guarda igual con pdfUrl nulo.
     */
    private Factura publicarPdf(Factura factura) {
        if (!almacenPdf.disponible()) {
            return factura;
        }
        try {
            byte[] contenido = pdf.factura(factura, negocio);
            String url = almacenPdf.publicarFactura(contenido, factura.getNumero().valor());
            factura.asignarPdfUrl(url);
            return facturas.guardar(factura);
        } catch (RuntimeException e) {
            log.warn("Seed: no se pudo publicar el PDF de {}: {}", factura.getNumero().valor(), e.getMessage());
            return factura;
        }
    }
}
