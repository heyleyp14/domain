package co.edu.unipamplona.ferreteria.application.port.out;

import java.util.function.Supplier;

/** Puerto de salida de transacciones: todo o nada alrededor de un bloque de trabajo. */
public interface TransaccionPort {

    <T> T ejecutar(Supplier<T> trabajo);
}
