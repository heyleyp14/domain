package co.edu.unipamplona.ferreteria.testsupport;

import co.edu.unipamplona.ferreteria.application.port.out.NumeracionFacturaPort;
import java.util.HashMap;
import java.util.Map;

public class NumeracionEnMemoria implements NumeracionFacturaPort {

    private final Map<Integer, Long> ultimoPorAnio = new HashMap<>();

    @Override
    public long siguienteSecuencia(int anio) {
        long siguiente = ultimoPorAnio.getOrDefault(anio, 0L) + 1;
        ultimoPorAnio.put(anio, siguiente);
        return siguiente;
    }
}
