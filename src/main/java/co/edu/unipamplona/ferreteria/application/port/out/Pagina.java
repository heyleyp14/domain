package co.edu.unipamplona.ferreteria.application.port.out;

import java.util.List;

/** Trozo de una lista y el total de elementos que hay antes de paginar. */
public record Pagina<T>(List<T> contenido, long total, int pagina, int tamano) {

    public int totalPaginas() {
        return tamano <= 0 ? 0 : (int) Math.ceil((double) total / tamano);
    }

    /** Corta una lista ya filtrada y ordenada. */
    public static <T> Pagina<T> de(List<T> todos, Paginacion p) {
        int desde = Math.min(p.desde(), todos.size());
        int hasta = Math.min(desde + p.tamano(), todos.size());
        return new Pagina<>(todos.subList(desde, hasta), todos.size(), p.pagina(), p.tamano());
    }
}
