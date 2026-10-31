package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.SeedResult;
import co.edu.unipamplona.ferreteria.application.port.in.SeedUseCase;
import co.edu.unipamplona.ferreteria.application.port.out.TransaccionPort;
import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.DataCleanupPort;
import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.NumeracionFacturaPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.domain.exception.AccesoDenegadoException;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import co.edu.unipamplona.ferreteria.domain.model.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Seed de datos de desarrollo: reinicia la base (borra lo existente) y crea 20 registros por entidad.
 *
 * <p>Orden de borrado: facturas (con líneas) → compras (con líneas) → productos → proveedores →
 * numeración de facturas. Esto evita violaciones de clave foránea por el cascade de las entidades.</p>
 *
 * <p>Datos fijos y reproducibles. El reloj se fija en 2026-10-20 15:00 UTC (hora de Bogotá).</p>
 */
public class SeedService implements SeedUseCase {

    private static final int CANTIDAD = 20;
    private static final Instant AHORA = Instant.parse("2026-10-20T15:00:00Z");
    /** Fecha de hoy según el reloj fijo (America/Bogota = UTC-5). */
    private static final LocalDate FECHA_HOY = LocalDate.of(2026, 10, 20);
    /** Rangos de fechas de compra anteriores a FECHA_HOY. */
    private static final LocalDate FECHA_BASE = LocalDate.of(2026, 9, 10);

    private final ProveedorRepositoryPort proveedores;
    private final ProductoRepositoryPort productos;
    private final CompraRepositoryPort compras;
    private final FacturaRepositoryPort facturas;
    private final NumeracionFacturaPort numeracion;
    private final DataCleanupPort cleanup;
    private final TransaccionPort transaccion;
    private final PoliticaAcceso acceso;

    public SeedService(ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos,
                       CompraRepositoryPort compras, FacturaRepositoryPort facturas,
                       NumeracionFacturaPort numeracion, DataCleanupPort cleanup, TransaccionPort transaccion, PoliticaAcceso acceso) {
        this.proveedores = proveedores;
        this.productos = productos;
        this.compras = compras;
        this.facturas = facturas;
        this.numeracion = numeracion;
        this.cleanup = cleanup;
        this.transaccion = transaccion;
        this.acceso = acceso;
    }

    /** Resetea la base y seedea 20 registros por cada entidad principal. */
        public SeedResult ejecutar() {
            return transaccion.ejecutar(() -> {
                acceso.asegurarAdmin(admin(), "ejecutar el seed");

                resetearBase();

                List<Proveedor> proveedorList = crearProveedores();
                List<Producto> productoList = crearProductos(proveedorList);
                List<Compra> compraList = crearCompras(proveedorList, productoList);
                List<Factura> facturaList = crearFacturas(productoList);

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

    private List<Proveedor> crearProveedores() {
        List<Proveedor> list = new ArrayList<>();
        for (int i = 0; i < CANTIDAD; i++) {
            String nombre = "Ferretería " + String.format("%02d", i + 1);
            Proveedor p = Proveedor.registrar(nombre,
                    "300" + (1000 + i), "proveedor" + (i + 1) + "@demo.co",
                    "Calle " + (i + 1) + " # " + (i + 1) + "-" + (i + 1),
                    "admin", AHORA);
            list.add(proveedores.guardar(p));
        }
        return list;
    }

    private List<Producto> crearProductos(List<Proveedor> proveedorList) {
        List<Producto> list = new ArrayList<>();
        for (int i = 0; i < CANTIDAD; i++) {
            long proveedorId = proveedorList.get(i % CANTIDAD).getId();
            Producto p = Producto.registrar("P-" + String.format("%03d", i + 1),
                    "Producto " + (i + 1), BigDecimal.valueOf(10000 + i * 100),
                    i % 2 == 0, 50 + (i % 50), proveedorId, "admin", AHORA);
            list.add(productos.guardar(p));
        }
        return list;
    }

    private List<Compra> crearCompras(List<Proveedor> proveedorList, List<Producto> productoList) {
        List<Compra> list = new ArrayList<>();
        for (int i = 0; i < CANTIDAD; i++) {
            long proveedorId = proveedorList.get(i % CANTIDAD).getId();
            LocalDate fecha = FECHA_BASE.plusDays(i);
            List<LineaCompra> lineas = new ArrayList<>();
            for (int j = 0; j < 3; j++) {
                int idx = (i * 3 + j) % CANTIDAD;
                Producto p = productoList.get(idx);
                lineas.add(new LineaCompra(p.getCodigo(), p.getNombre(), 10 + j,
                        Dinero.de(BigDecimal.valueOf(5000 + j * 1000))));
            }
            Compra c = Compra.registrar(proveedorId, fecha, FECHA_HOY, "admin", AHORA, lineas);
            list.add(compras.guardar(c));
        }
        return list;
    }

    private List<Factura> crearFacturas(List<Producto> productoList) {
        List<Factura> list = new ArrayList<>();
        String[] clientes = {
                "Cliente A", "Cliente B", "Cliente C", "Cliente D", "Cliente E",
                "Cliente F", "Cliente G", "Cliente H", "Cliente I", "Cliente J",
                "Cliente K", "Cliente L", "Cliente M", "Cliente N", "Cliente O",
                "Cliente P", "Cliente Q", "Cliente R", "Cliente S", "Cliente T"
        };
        for (int i = 0; i < CANTIDAD; i++) {
            int secuencia = (int) numeracion.siguienteSecuencia(2026);
            String numero = "FAC-2026-" + String.format("%06d", secuencia);
            List<LineaFactura> lineas = new ArrayList<>();
            for (int j = 0; j < 3; j++) {
                int idx = (i * 3 + j) % CANTIDAD;
                Producto p = productoList.get(idx);
                lineas.add(new LineaFactura(p.getCodigo(), p.getNombre(), 2 + j,
                        Dinero.de(BigDecimal.valueOf(15000 + j * 2000)), j % 2 == 0));
            }
            Factura f = Factura.emitir(NumeroFactura.desde(numero), clientes[i],
                    "Calle " + (i + 1) + " # 1-1", "300" + (1000 + i), "vendedor1", lineas, AHORA);
            list.add(facturas.guardar(f));
        }
        return list;
    }
}
