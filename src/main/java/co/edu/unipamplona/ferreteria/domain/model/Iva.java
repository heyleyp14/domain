package co.edu.unipamplona.ferreteria.domain.model;

import java.math.BigDecimal;

/** IVA general de Colombia (19 %). Un producto lo lleva o no según su indicador «aplica IVA». */
public final class Iva {

    public static final BigDecimal TASA = new BigDecimal("0.19");

    private Iva() { }

    /** El IVA de una base: 19 % con redondeo a 2 decimales (HALF_UP), que es el valor que se imprime en la factura. */
    public static Dinero sobre(Dinero base) {
        return new Dinero(base.valor().multiply(TASA));
    }
}
