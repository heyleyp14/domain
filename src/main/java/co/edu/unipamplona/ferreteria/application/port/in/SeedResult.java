package co.edu.unipamplona.ferreteria.application.port.in;

import java.util.Map;

/** Resultado del seed: cantidades insertadas de cada entidad. */
public record SeedResult(int proveedores, int productos, int compras, int facturas) {

    public static SeedResult de(int proveedores, int productos, int compras, int facturas) {
        return new SeedResult(proveedores, productos, compras, facturas);
    }

    public Map<String, Integer> toMap() {
        return Map.of("proveedores", proveedores, "productos", productos, "compras", compras, "facturas", facturas);
    }
}
