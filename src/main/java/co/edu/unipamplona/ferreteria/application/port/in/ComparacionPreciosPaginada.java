package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.out.Pagina;
import co.edu.unipamplona.ferreteria.domain.model.ComparacionPrecios;

/** Comparación de precios con una página de las ofertas por proveedor. */
public record ComparacionPreciosPaginada(String codigoProducto, String nombreProducto,
                                         Pagina<ComparacionPrecios.Oferta> ofertas) { }
