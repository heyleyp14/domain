package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.exception.AlmacenamientoNoDisponibleException;
import co.edu.unipamplona.ferreteria.application.port.out.AlmacenPdfPort;
import java.util.ArrayList;
import java.util.List;

/** Doble del almacen de PDFs: registra que facturas se publicaron y permite simular una caida. */
public class AlmacenPdfFalso implements AlmacenPdfPort {

    public final List<String> publicadas = new ArrayList<>();
    private boolean falla;

    public void fallar(boolean falla) {
        this.falla = falla;
    }

    @Override
    public String publicarFactura(byte[] contenido, String numeroFactura) {
        if (falla) {
            throw new AlmacenamientoNoDisponibleException("fallo simulado de Cloudinary");
        }
        publicadas.add(numeroFactura);
        return "https://res.cloudinary.com/demo/image/upload/ferreteria/facturas/" + numeroFactura + ".pdf";
    }
}
