package co.edu.unipamplona.ferreteria.application.port.out;

/**
 * Puerto de salida: publica documentos PDF en un almacenamiento externo.
 * La aplicacion no conoce Cloudinary ni ningun proveedor concreto.
 */
public interface AlmacenPdfPort {

    /** true cuando hay credencial o preset configurado; permite omitir la publicacion en entornos sin Cloudinary. */
    default boolean disponible() {
        return true;
    }

    /**
     * Publica el PDF de una factura y devuelve su URL publica.
     *
     * @param contenido       bytes del PDF
     * @param numeroFactura   numero ya validado (por ejemplo, FAC-2026-000001)
     * @throws co.edu.unipamplona.ferreteria.application.exception.AlmacenamientoNoDisponibleException
     *         si el almacenamiento no esta configurado o falla
     */
    String publicarFactura(byte[] contenido, String numeroFactura);
}
