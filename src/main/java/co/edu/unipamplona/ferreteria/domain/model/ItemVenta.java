package co.edu.unipamplona.ferreteria.domain.model;

/** Lo que el vendedor pide: un código de producto y una cantidad (el código ya normalizado). */
public record ItemVenta(String codigo, int cantidad) { }
