package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import java.util.List;

/**
 * Modelos de vista listos para Thymeleaf: solo listas y cadenas ya formateadas.
 * La plantilla no calcula dinero ni fechas; el adaptador lo hace una sola vez.
 */
final class VistasPdf {

    private VistasPdf() { }

    record Negocio(String nombre, String ciudad, String direccion, String telefono, String identificacion) { }

    record LineaFactura(String codigo, String nombre, int cantidad, String precio, String subtotal, String iva, String total) { }

    record Factura(String numero, String fecha, String estado, String clienteNombre, String clienteDireccion,
                   String clienteTelefono, String vendedor, boolean anulada, String motivoAnulacion, String anuladaPor,
                   List<LineaFactura> lineas, String subtotal, String iva, String total, String totalEnLetras) { }

    record LineaReporte(String codigo, String nombre, int cantidad, String subtotal, String iva, String total) { }

    record ResumenFactura(String numero, String fecha, String cliente, String vendedor, String total, boolean anulada) { }

    record Reporte(String fecha, boolean sinVentas, int facturasEmitidas, int facturasAnuladas, int unidadesVendidas,
                   String subtotal, String iva, String total, List<LineaReporte> productos,
                   List<ResumenFactura> facturas) { }
}
