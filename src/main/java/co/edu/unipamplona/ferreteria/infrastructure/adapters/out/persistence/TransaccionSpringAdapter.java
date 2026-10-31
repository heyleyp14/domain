package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.persistence;

import co.edu.unipamplona.ferreteria.application.port.out.TransaccionPort;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Ejecuta el bloque de trabajo en una transacción de Spring; toda excepción de dominio revierte. */
@Component
public class TransaccionSpringAdapter implements TransaccionPort {

    private final TransactionTemplate transactionTemplate;

    public TransaccionSpringAdapter(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public <T> T ejecutar(Supplier<T> trabajo) {
        return transactionTemplate.execute(status -> trabajo.get());
    }
}
