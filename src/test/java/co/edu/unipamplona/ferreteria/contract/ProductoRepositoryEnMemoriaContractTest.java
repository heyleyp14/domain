package co.edu.unipamplona.ferreteria.contract;

import co.edu.unipamplona.ferreteria.application.port.out.ProductoRepositoryPort;
import co.edu.unipamplona.ferreteria.testsupport.ProductoRepositoryEnMemoria;

/** El doble en memoria que usan las pruebas de los casos de uso cumple el mismo contrato que el adaptador real. */
class ProductoRepositoryEnMemoriaContractTest extends ProductoRepositoryContractTest {
    private final ProductoRepositoryPort repo = new ProductoRepositoryEnMemoria();

    @Override
    protected ProductoRepositoryPort repo() { return repo; }
}
