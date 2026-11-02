package co.edu.unipamplona.ferreteria.application;

import co.edu.unipamplona.ferreteria.application.port.in.ProductoDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.command.*;
import co.edu.unipamplona.ferreteria.application.service.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import co.edu.unipamplona.ferreteria.testsupport.*;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/** Arma los servicios con dobles en memoria: así se prueba la aplicación sin Spring ni base de datos. */
final class Escenario {

    final ProveedorRepositoryEnMemoria proveedores = new ProveedorRepositoryEnMemoria();
    final ProductoRepositoryEnMemoria productos = new ProductoRepositoryEnMemoria();
    final FacturaRepositoryEnMemoria facturas = new FacturaRepositoryEnMemoria();
    final CompraRepositoryEnMemoria compras = new CompraRepositoryEnMemoria();
    final NumeracionEnMemoria numeracion = new NumeracionEnMemoria();
    final GeneradorPdfFalso pdf = new GeneradorPdfFalso();
    final AlmacenPdfFalso almacenPdf = new AlmacenPdfFalso();
    final TransaccionDirecta tx = new TransaccionDirecta();
    final RelojAjustable reloj = Datos.relojAjustable();
    final PoliticaAcceso acceso = new PoliticaAcceso();

    final CatalogoService catalogo = new CatalogoService(proveedores, productos, tx, reloj, acceso);
    final VentaService venta = new VentaService(facturas, productos, numeracion, pdf, almacenPdf, Datos.NEGOCIO, tx, reloj, acceso);
    final CompraService compra = new CompraService(compras, proveedores, productos, tx, reloj, acceso);
    final ComparacionPreciosService comparacion = new ComparacionPreciosService(compras, proveedores, productos, acceso);
    final ReporteVentasService reporte = new ReporteVentasService(facturas, pdf, Datos.NEGOCIO, reloj, acceso);

    Actor admin() { return Datos.admin(); }

    Actor vendedor() { return Datos.vendedor("vendedor1@murano3d.co"); }

    Proveedor proveedor(String nombre) {
        return catalogo.registrarProveedor(admin(), new RegistrarProveedorCommand(nombre, "3001234567", null, null));
    }

    Producto producto(String codigo, String precio, boolean iva, int stock, Proveedor proveedor) {
        ProductoDetalle d = catalogo.registrarProducto(admin(), new RegistrarProductoCommand(codigo, "Producto " + codigo,
                new BigDecimal(precio), iva, stock, proveedor.getId()));
        return d.producto();
    }

    int stock(String codigo) { return productos.buscarPorCodigo(codigo).orElseThrow().getStock(); }

    Factura vender(String cliente, ItemVentaCommand... items) {
        return venta.emitir(vendedor(), new EmitirFacturaCommand(cliente, "Calle 1 # 2-3", "3101234567", List.of(items)));
    }

    static ItemVentaCommand item(String codigo, int cantidad) { return new ItemVentaCommand(codigo, cantidad); }

    void avanzar(Duration d) { reloj.avanzar(d); }
}
