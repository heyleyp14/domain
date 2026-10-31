package co.edu.unipamplona.ferreteria.domain.exception;

import java.util.List;
import java.util.stream.Collectors;

/** La venta se cancela y se informan TODOS los productos que no alcanzan, no solo el primero (409). */
public class StockInsuficienteException extends EstadoInvalidoException {

    private final List<Faltante> faltantes;

    public StockInsuficienteException(List<Faltante> faltantes) {
        super("Stock insuficiente: " + describir(faltantes));
        this.faltantes = List.copyOf(faltantes);
    }

    public List<Faltante> getFaltantes() { return faltantes; }

    public record Faltante(String codigo, String nombre, int disponible, int solicitado) {
        public String describir() {
            return codigo + " " + nombre + " (disponible " + disponible + ", solicitado " + solicitado + ")";
        }
    }

    private static String describir(List<Faltante> faltantes) {
        return faltantes.stream().map(Faltante::describir).collect(Collectors.joining("; "));
    }
}
