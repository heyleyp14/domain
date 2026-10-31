package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.ProveedorRepositoryPort;
import co.edu.unipamplona.ferreteria.testsupport.ProveedorRepositoryEnMemoria;

/** El doble en memoria que usan las pruebas de los casos de uso cumple el mismo contrato que el adaptador real. */
class ProveedorRepositoryEnMemoriaContractTest extends ProveedorRepositoryContractTest {
    private final ProveedorRepositoryPort repo = new ProveedorRepositoryEnMemoria();

    @Override
    protected ProveedorRepositoryPort repo() { return repo; }
}
