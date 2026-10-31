package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.CompraRepositoryPort;
import co.edu.unipamplona.ferreteria.testsupport.CompraRepositoryEnMemoria;

/** El doble en memoria que usan las pruebas de los casos de uso cumple el mismo contrato que el adaptador real. */
class CompraRepositoryEnMemoriaContractTest extends CompraRepositoryContractTest {
    private final CompraRepositoryPort repo = new CompraRepositoryEnMemoria();

    @Override
    protected CompraRepositoryPort repo() { return repo; }
}
