package co.edu.unipamplona.ferreteria.application.port.in;

import co.edu.unipamplona.ferreteria.application.port.in.SeedResult;

/** Caso de uso de la administración de datos: reinicia y seedea 20 registros por entidad. */
public interface SeedUseCase {

    SeedResult ejecutar();
}
