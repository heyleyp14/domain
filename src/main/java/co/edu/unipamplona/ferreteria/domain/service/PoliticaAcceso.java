package co.edu.unipamplona.ferreteria.domain.service;

import co.edu.unipamplona.ferreteria.domain.exception.AccesoDenegadoException;
import co.edu.unipamplona.ferreteria.domain.model.Actor;

/** Quién puede hacer qué. Toda la regla de permisos en un solo lugar (SRP); los controladores no deciden nada. */
public class PoliticaAcceso {

    /** Cualquier usuario con un rol que este servicio conozca (USER o ADMIN): vende, consulta y busca. */
    public void asegurarUsuario(Actor actor) {
        if (!actor.tieneRolConocido()) {
            throw new AccesoDenegadoException("Su cuenta no tiene un rol autorizado para usar este servicio");
        }
    }

    /** Administrar el catálogo, comprar, comparar precios, anular y ver reportes es solo del administrador. */
    public void asegurarAdmin(Actor actor, String operacion) {
        if (!actor.esAdmin()) {
            throw new AccesoDenegadoException("Solo el administrador puede " + operacion);
        }
    }
}
