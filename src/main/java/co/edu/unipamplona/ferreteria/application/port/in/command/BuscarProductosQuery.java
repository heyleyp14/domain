package co.edu.unipamplona.ferreteria.application.port.in.command;

/** Todos los filtros son opcionales y combinables. El texto busca en código, nombre y nombre del proveedor. */
public record BuscarProductosQuery(String texto, Boolean soloActivos, Boolean bajoStock) { }
