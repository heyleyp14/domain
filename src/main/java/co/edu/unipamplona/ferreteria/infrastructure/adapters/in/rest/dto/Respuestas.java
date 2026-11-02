package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto;

import co.edu.unipamplona.ferreteria.application.port.in.ComparacionPreciosPaginada;
import co.edu.unipamplona.ferreteria.application.port.in.CompraDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.ProductoDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.ProveedorDetallePaginado;
import co.edu.unipamplona.ferreteria.application.port.in.ReporteDiarioPaginado;
import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.domain.model.Auditoria;
import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios;
import co.edu.unipamplona.ferreteria.domain.model.Factura;
import co.edu.unipamplona.ferreteria.domain.model.LineaCompra;
import co.edu.unipamplona.ferreteria.domain.model.LineaFactura;
import co.edu.unipamplona.ferreteria.domain.model.LineaReporte;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import co.edu.unipamplona.ferreteria.domain.model.ReporteDiario;
import co.edu.unipamplona.ferreteria.domain.model.ResumenFactura;
import co.edu.unipamplona.ferreteria.domain.model.TendenciaVentas;
import co.edu.unipamplona.ferreteria.domain.model.VentaDiaria;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Lo que devuelve la API. Se arma desde el dominio; así el JSON no queda atado a las clases internas. */
public final class Respuestas {

    private Respuestas() { }

    public record AuditoriaR(String creadoPor, Instant creadoEn, String modificadoPor, Instant modificadoEn) {
        static AuditoriaR de(Auditoria a) {
            return new AuditoriaR(a.creadoPor(), a.creadoEn(), a.modificadoPor(), a.modificadoEn());
        }
    }

    public record ProveedorR(Long id, String nombre, String telefono, String correo, String direccion, AuditoriaR auditoria) {
        public static ProveedorR de(Proveedor p) {
            return new ProveedorR(p.getId(), p.getNombre(), p.getTelefono(), p.getCorreo(), p.getDireccion(), AuditoriaR.de(p.getAuditoria()));
        }
    }

    public record ProductoResumenR(String codigo, String nombre, BigDecimal precioBase, boolean aplicaIva, BigDecimal precioFinal,
                                   int stock, boolean stockBajo, boolean activo) {
        static ProductoResumenR de(Producto p) {
            return new ProductoResumenR(p.getCodigo(), p.getNombre(), p.getPrecioBase().valor(), p.isAplicaIva(),
                    p.precioFinal().valor(), p.getStock(), p.stockBajo(), p.isActivo());
        }
    }

    public record ProveedorDetalleR(ProveedorR proveedor, long totalProductos, int pagina, int tamano, int totalPaginas,
                                    List<ProductoResumenR> productos) {
        public static ProveedorDetalleR de(ProveedorDetallePaginado d) {
            return new ProveedorDetalleR(ProveedorR.de(d.proveedor()), d.productos().total(), d.productos().pagina(),
                    d.productos().tamano(), d.productos().totalPaginas(),
                    d.productos().contenido().stream().map(ProductoResumenR::de).toList());
        }
    }

    public record ProductoR(Long id, String codigo, String nombre, BigDecimal precioBase, boolean aplicaIva, BigDecimal precioFinal,
                            int stock, boolean stockBajo, boolean activo, Long proveedorId, String proveedorNombre, AuditoriaR auditoria) {
        public static ProductoR de(ProductoDetalle d) {
            Producto p = d.producto();
            return new ProductoR(p.getId(), p.getCodigo(), p.getNombre(), p.getPrecioBase().valor(), p.isAplicaIva(),
                    p.precioFinal().valor(), p.getStock(), p.stockBajo(), p.isActivo(), d.proveedor().getId(),
                    d.proveedor().getNombre(), AuditoriaR.de(p.getAuditoria()));
        }
    }

    /** Búsqueda de productos: si no hay resultados lo dice con un mensaje claro en vez de fallar. */
    public record BusquedaProductosR(long total, int pagina, int tamano, int totalPaginas, String mensaje,
                                     List<ProductoR> productos) {
        public static BusquedaProductosR de(Pagina<ProductoDetalle> p) {
            return new BusquedaProductosR(p.total(), p.pagina(), p.tamano(), p.totalPaginas(),
                    p.total() == 0 ? "No se encontraron productos" : null,
                    p.contenido().stream().map(ProductoR::de).toList());
        }
    }

    public record ProveedoresR(long total, int pagina, int tamano, int totalPaginas, List<ProveedorR> proveedores) {
        public static ProveedoresR de(Pagina<Proveedor> p) {
            return new ProveedoresR(p.total(), p.pagina(), p.tamano(), p.totalPaginas(),
                    p.contenido().stream().map(ProveedorR::de).toList());
        }
    }

    public record ComprasR(long total, int pagina, int tamano, int totalPaginas, List<CompraR> compras) {
        public static ComprasR de(Pagina<CompraDetalle> p) {
            return new ComprasR(p.total(), p.pagina(), p.tamano(), p.totalPaginas(),
                    p.contenido().stream().map(CompraR::de).toList());
        }
    }

    public record LineaFacturaR(String codigo, String nombre, int cantidad, BigDecimal precioBase, boolean aplicaIva,
                                BigDecimal subtotal, BigDecimal iva, BigDecimal total) {
        static LineaFacturaR de(LineaFactura l) {
            return new LineaFacturaR(l.codigoProducto(), l.nombreProducto(), l.cantidad(), l.precioBase().valor(), l.aplicaIva(),
                    l.subtotal().valor(), l.iva().valor(), l.total().valor());
        }
    }

    public record FacturaR(String numero, Instant fecha, String estado, String clienteNombre, String clienteDireccion,
                           String clienteTelefono, String vendedor, List<LineaFacturaR> lineas, BigDecimal subtotal, BigDecimal iva,
                           BigDecimal total, String anuladaPor, Instant anuladaEn, String motivoAnulacion, String pdfUrl) {
        public static FacturaR de(Factura f) {
            return new FacturaR(f.getNumero().valor(), f.getFecha(), f.getEstado().name(), f.getClienteNombre(),
                    f.getClienteDireccion(), f.getClienteTelefono(), f.getVendedor(),
                    f.getLineas().stream().map(LineaFacturaR::de).toList(), f.subtotal().valor(), f.iva().valor(), f.total().valor(),
                    f.getAnuladaPor(), f.getAnuladaEn(), f.getMotivoAnulacion(), f.getPdfUrl());
        }
    }

    public record LineaCompraR(String codigo, String nombre, int cantidad, BigDecimal precioUnitario, BigDecimal total) {
        static LineaCompraR de(LineaCompra l) {
            return new LineaCompraR(l.codigoProducto(), l.nombreProducto(), l.cantidad(), l.precioUnitario().valor(), l.total().valor());
        }
    }

    public record CompraR(String codigo, long proveedorId, String proveedorNombre, LocalDate fecha, String registradaPor,
                          Instant registradaEn, List<LineaCompraR> lineas, BigDecimal total) {
        public static CompraR de(CompraDetalle d) {
            var c = d.compra();
            return new CompraR(c.codigo(), c.getProveedorId(), d.proveedorNombre(), c.getFecha(), c.getRegistradaPor(),
                    c.getRegistradaEn(), c.getLineas().stream().map(LineaCompraR::de).toList(), c.total().valor());
        }
    }

    public record OfertaR(long proveedorId, String proveedorNombre, BigDecimal ultimoPrecio, LocalDate fechaUltimaCompra,
                          BigDecimal menorPrecioHistorico, int compras, boolean esMenor) { }

    public record ComparacionR(String codigoProducto, String nombreProducto, String mensaje, long totalOfertas,
                               int pagina, int tamano, int totalPaginas, List<OfertaR> ofertas) {
        public static ComparacionR de(ComparacionPreciosPaginada c) {
            List<OfertaR> o = c.ofertas().contenido().stream()
                    .map(x -> new OfertaR(x.proveedorId(), x.proveedorNombre(), x.ultimoPrecio().valor(), x.fechaUltimaCompra(),
                            x.menorPrecioHistorico().valor(), x.compras(), x.esMenor()))
                    .toList();
            return new ComparacionR(c.codigoProducto(), c.nombreProducto(),
                    c.ofertas().total() == 0 ? "Este producto aún no tiene compras registradas" : null,
                    c.ofertas().total(), c.ofertas().pagina(), c.ofertas().tamano(), c.ofertas().totalPaginas(), o);
        }
    }

    public record LineaReporteR(String codigo, String nombre, int cantidad, BigDecimal subtotal, BigDecimal iva, BigDecimal total) {
        static LineaReporteR de(LineaReporte l) {
            return new LineaReporteR(l.codigoProducto(), l.nombreProducto(), l.cantidad(), l.subtotal().valor(), l.iva().valor(), l.total().valor());
        }
    }

    public record ResumenFacturaR(String numero, Instant fecha, String cliente, String vendedor, BigDecimal total, boolean anulada) {
        static ResumenFacturaR de(ResumenFactura r) {
            return new ResumenFacturaR(r.numero(), r.fecha(), r.cliente(), r.vendedor(), r.total().valor(), r.anulada());
        }
    }

    public record ReporteDiarioR(LocalDate fecha, String mensaje, int facturasEmitidas, int facturasAnuladas, int unidadesVendidas,
                                 BigDecimal subtotal, BigDecimal iva, BigDecimal total,
                                 long productosTotal, int paginaProductos, int tamanoProductos, int totalPaginasProductos,
                                 List<LineaReporteR> productos,
                                 long facturasTotal, int paginaFacturas, int tamanoFacturas, int totalPaginasFacturas,
                                 List<ResumenFacturaR> facturas) {
        public static ReporteDiarioR de(ReporteDiarioPaginado p) {
            ReporteDiario r = p.reporte();
            return new ReporteDiarioR(r.fecha(), r.sinVentas() ? "No se registraron ventas en esta fecha" : null,
                    r.facturasEmitidas(), r.facturasAnuladas(), r.unidadesVendidas(), r.subtotal().valor(), r.iva().valor(),
                    r.total().valor(),
                    p.productos().total(), p.productos().pagina(), p.productos().tamano(), p.productos().totalPaginas(),
                    p.productos().contenido().stream().map(LineaReporteR::de).toList(),
                    p.facturas().total(), p.facturas().pagina(), p.facturas().tamano(), p.facturas().totalPaginas(),
                    p.facturas().contenido().stream().map(ResumenFacturaR::de).toList());
        }
    }

    public record VentaDiariaR(LocalDate fecha, BigDecimal total, int facturasEmitidas, int unidadesVendidas) {
        static VentaDiariaR de(VentaDiaria d) {
            return new VentaDiariaR(d.fecha(), d.total().valor(), d.facturasEmitidas(), d.unidadesVendidas());
        }
    }

    public record TendenciaVentasR(LocalDate desde, LocalDate hasta, long dias, BigDecimal total, String mensaje,
                                   List<VentaDiariaR> puntos) {
        public static TendenciaVentasR de(TendenciaVentas t) {
            return new TendenciaVentasR(t.desde(), t.hasta(), t.diasDelRango(), t.total().valor(),
                    t.sinVentas() ? "No se registraron ventas en el periodo consultado" : null,
                    t.dias().stream().map(VentaDiariaR::de).toList());
        }
    }
}
