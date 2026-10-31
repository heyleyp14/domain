package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest.dto.ErrorResponse;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Traduce las excepciones del dominio a códigos HTTP, con mensajes claros y sin detalles técnicos. */
@RestControllerAdvice
public class RestExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(RestExceptionHandler.class);

    @ExceptionHandler(ValorInvalidoException.class)
    ResponseEntity<ErrorResponse> valorInvalido(ValorInvalidoException e) {
        return responder(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(AccesoDenegadoException.class)
    ResponseEntity<ErrorResponse> accesoDenegado(AccesoDenegadoException e) {
        return responder(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(NoEncontradoException.class)
    ResponseEntity<ErrorResponse> noEncontrado(NoEncontradoException e) {
        return responder(HttpStatus.NOT_FOUND, e.getMessage());
    }

    /** La venta no se hace y se informan TODOS los productos que no alcanzan (código, disponible y solicitado). */
    @ExceptionHandler(StockInsuficienteException.class)
    ResponseEntity<ErrorResponse> stockInsuficiente(StockInsuficienteException e) {
        List<String> detalles = e.getFaltantes().stream().map(StockInsuficienteException.Faltante::describir).toList();
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(409, HttpStatus.CONFLICT.getReasonPhrase(), "Stock insuficiente para completar la venta", detalles));
    }

    @ExceptionHandler({DuplicadoException.class, EstadoInvalidoException.class})
    ResponseEntity<ErrorResponse> conflicto(DominioException e) {
        return responder(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(DominioException.class)
    ResponseEntity<ErrorResponse> dominio(DominioException e) {
        return responder(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class,
            DataIntegrityViolationException.class})
    ResponseEntity<ErrorResponse> concurrencia(Exception e) {
        LOG.warn("Conflicto de concurrencia: {}", e.toString());
        return responder(HttpStatus.CONFLICT, "Otra operación modificó los mismos datos al mismo tiempo; intente de nuevo");
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    ResponseEntity<ErrorResponse> peticionMalFormada(Exception e) {
        return responder(HttpStatus.BAD_REQUEST, "La petición está mal formada o le faltan datos");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> inesperado(Exception e) {
        LOG.error("Error no controlado", e);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor");   // sin filtrar detalles internos
    }

    private ResponseEntity<ErrorResponse> responder(HttpStatus estado, String mensaje) {
        return ResponseEntity.status(estado).body(ErrorResponse.de(estado.value(), estado.getReasonPhrase(), mensaje));
    }
}
