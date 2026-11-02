package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.DocumentoPdf;
import co.edu.unipamplona.ferreteria.application.port.in.VentaUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.EmitirFacturaCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.ItemVentaCommand;
import co.edu.unipamplona.ferreteria.application.port.out.*;
import co.edu.unipamplona.ferreteria.domain.exception.FacturaNoEncontradaException;
import co.edu.unipamplona.ferreteria.domain.exception.ProductoNoEncontradoException;
import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.domain.service.EmisionFacturaService;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Vender. Emitir la factura, descontar el stock y consumir el número de factura es UNA sola transacción: si algo
 * falla, no queda nada a medias y el número no se gasta. Los productos se bloquean (en orden de código) mientras dura.
 */
public class VentaService implements VentaUseCase {

    private static final Logger log = LoggerFactory.getLogger(VentaService.class);

    private final FacturaRepositoryPort facturas;
    private final ProductoRepositoryPort productos;
    private final NumeracionFacturaPort numeracion;
    private final GeneradorPdfPort pdf;
    private final AlmacenPdfPort almacenPdf;
    private final DatosNegocio negocio;
    private final TransaccionPort transaccion;
    private final Clock reloj;
    private final PoliticaAcceso acceso;
    private final EmisionFacturaService emision = new EmisionFacturaService();

    public VentaService(FacturaRepositoryPort facturas, ProductoRepositoryPort productos, NumeracionFacturaPort numeracion,
                        GeneradorPdfPort pdf, AlmacenPdfPort almacenPdf, DatosNegocio negocio,
                        TransaccionPort transaccion, Clock reloj, PoliticaAcceso acceso) {
        this.facturas = facturas;
        this.productos = productos;
        this.numeracion = numeracion;
        this.pdf = pdf;
        this.almacenPdf = almacenPdf;
        this.negocio = negocio;
        this.transaccion = transaccion;
        this.reloj = reloj;
        this.acceso = acceso;
    }

    @Override
    public Factura emitir(Actor actor, EmitirFacturaCommand c) {
        acceso.asegurarUsuario(actor);
        Validacion.exigir("nombre del cliente", c.clienteNombre(), "productos", c.items());
        List<ItemVenta> items = leerItems(c.items());
        Factura guardada = transaccion.ejecutar(() -> {
            List<ItemVenta> consolidados = emision.consolidar(items);
            Map<String, Producto> porCodigo = productosBloqueados(consolidados);
            List<LineaFactura> lineas = emision.prepararLineas(consolidados, porCodigo);
            Instant ahora = reloj.instant();
            int anio = LocalDate.now(reloj).getYear();
            NumeroFactura numero = NumeroFactura.de(anio, numeracion.siguienteSecuencia(anio));
            Factura factura = Factura.emitir(numero, c.clienteNombre(), c.clienteDireccion(), c.clienteTelefono(),
                    actor.username(), lineas, ahora);
            for (ItemVenta i : consolidados) {
                Producto p = porCodigo.get(i.codigo());
                p.descontar(i.cantidad(), actor.username(), ahora);
                productos.guardar(p);
            }
            return facturas.guardar(factura);
        });
        publicarPdf(guardada, null);
        return guardada;
    }

    @Override
    public Factura consultar(Actor actor, String numero) {
        acceso.asegurarUsuario(actor);
        return facturaExistente(numero);
    }

    @Override
    public Factura anular(Actor actor, String numero, String motivo) {
        acceso.asegurarAdmin(actor, "anular facturas");
        Validacion.exigir("número de factura", numero, "motivo", motivo);
        Factura anulada = transaccion.ejecutar(() -> {
            String valor = NumeroFactura.desde(numero).valor();
            Factura f = facturas.buscarPorNumeroBloqueando(valor).orElseThrow(() -> new FacturaNoEncontradaException(valor));
            Instant ahora = reloj.instant();
            f.anular(motivo, actor.username(), ahora);
            List<ItemVenta> devueltos = new ArrayList<>();
            for (LineaFactura l : f.getLineas()) devueltos.add(new ItemVenta(l.codigoProducto(), l.cantidad()));
            Map<String, Producto> porCodigo = productosBloqueados(devueltos);
            for (ItemVenta i : devueltos) {
                Producto p = porCodigo.get(i.codigo());
                p.reponer(i.cantidad(), actor.username(), ahora);
                productos.guardar(p);
            }
            return facturas.guardar(f);
        });
        publicarPdf(anulada, null);
        return anulada;
    }

    @Override
    public DocumentoPdf pdf(Actor actor, String numero) {
        acceso.asegurarUsuario(actor);
        Factura f = facturaExistente(numero);
        byte[] contenido = pdf.factura(f, negocio);
        if (f.getPdfUrl() == null || f.getPdfUrl().isBlank()) {
            publicarPdf(f, contenido);
        }
        return new DocumentoPdf("factura-" + f.getNumero().valor() + ".pdf", contenido);
    }

    /**
     * Publica el PDF en el almacen externo despues del commit. Es best-effort: una caida de Cloudinary
     * no puede tumbar una venta ya registrada; la URL se reintenta al pedir el PDF o al anular.
     */
    private void publicarPdf(Factura factura, byte[] contenido) {
        try {
            byte[] bytes = contenido != null ? contenido : pdf.factura(factura, negocio);
            String url = almacenPdf.publicarFactura(bytes, factura.getNumero().valor());
            if (url == null || url.equals(factura.getPdfUrl())) {
                return;
            }
            factura.asignarPdfUrl(url);
            transaccion.ejecutar(() -> facturas.guardar(factura));
        } catch (RuntimeException e) {
            log.warn("No se pudo publicar el PDF de la factura {}: {}",
                    factura.getNumero() == null ? "?" : factura.getNumero().valor(), e.getMessage());
        }
    }

    private Factura facturaExistente(String numero) {
        Validacion.exigir("número de factura", numero);
        String valor = NumeroFactura.desde(numero).valor();
        return facturas.buscarPorNumero(valor).orElseThrow(() -> new FacturaNoEncontradaException(valor));
    }

    /** Valida cada ítem y normaliza el código; los errores de formato son 400 antes de abrir la transacción. */
    private List<ItemVenta> leerItems(List<ItemVentaCommand> comandos) {
        List<ItemVenta> r = new ArrayList<>();
        for (ItemVentaCommand i : comandos) {
            if (i == null) throw new ValorInvalidoException("Hay un producto vacío en la venta");
            Validacion.exigir("código del producto", i.codigo(), "cantidad", i.cantidad());
            r.add(new ItemVenta(Producto.normalizarCodigo(i.codigo()), i.cantidad()));
        }
        return r;
    }

    /** Bloquea los productos de la venta; si falta alguno, es un 404 que los nombra todos. */
    private Map<String, Producto> productosBloqueados(List<ItemVenta> items) {
        List<String> codigos = items.stream().map(ItemVenta::codigo).distinct().sorted().toList();
        Map<String, Producto> porCodigo = new LinkedHashMap<>();
        for (Producto p : productos.buscarPorCodigosBloqueando(codigos)) porCodigo.put(p.getCodigo(), p);
        List<String> faltan = codigos.stream().filter(c -> !porCodigo.containsKey(c)).toList();
        if (!faltan.isEmpty()) throw new ProductoNoEncontradoException(faltan);
        return porCodigo;
    }
}
