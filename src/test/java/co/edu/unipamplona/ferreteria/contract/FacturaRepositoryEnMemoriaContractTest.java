package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.FacturaRepositoryPort;
import co.edu.unipamplona.ferreteria.testsupport.FacturaRepositoryEnMemoria;

/** El doble en memoria que usan las pruebas de los casos de uso cumple el mismo contrato que el adaptador real. */
class FacturaRepositoryEnMemoriaContractTest extends FacturaRepositoryContractTest {
    private final FacturaRepositoryPort repo = new FacturaRepositoryEnMemoria();

    @Override
    protected FacturaRepositoryPort repo() { return repo; }
}
