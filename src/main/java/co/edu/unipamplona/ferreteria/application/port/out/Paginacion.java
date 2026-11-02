package co.edu.unipamplona.ferreteria.application.port.out;

import co.edu.unipamplona.ferreteria.domain.exception.ValorInvalidoException;

/** Página solicitada a una lista (1-based). */
public record Paginacion(int pagina, int tamano) {

    public static final int TAMANO_POR_DEFECTO = 20;
    public static final int TAMANO_MAXIMO = 100;

    public static Paginacion de(Integer pagina, Integer tamano) {
        int p = pagina == null ? 1 : pagina;
        int t = tamano == null ? TAMANO_POR_DEFECTO : tamano;
        if (p < 1) {
            throw new ValorInvalidoException("La página debe ser 1 o mayor");
        }
        if (t < 1 || t > TAMANO_MAXIMO) {
            throw new ValorInvalidoException("El tamaño de página debe estar entre 1 y " + TAMANO_MAXIMO);
        }
        return new Paginacion(p, t);
    }

    public int desde() {
        return (pagina - 1) * tamano;
    }
}
