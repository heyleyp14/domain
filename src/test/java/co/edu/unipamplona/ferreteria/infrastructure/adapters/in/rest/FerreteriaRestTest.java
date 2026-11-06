package co.edu.unipamplona.ferreteria.infrastructure.adapters.in.rest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Prueba de punta a punta (HTTP -> casos de uso -> dominio -> H2) con seguridad JWT real.
 * La clave de abajo es SOLO para pruebas: no es la de AuthCore ni se usa fuera de este archivo.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "seguridad.jwt.secret-base64=" + FerreteriaRestTest.SECRETO_DE_PRUEBA)
public class FerreteriaRestTest {

    public static final String SECRETO_DE_PRUEBA =
            "dGVzdC1vbmx5LXNlY3JldC1mb3ItZmVycmV0ZXJpYS1ub3QtYS1yZWFsLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MA==";

    @Autowired
    private MockMvc mvc;

    private String token(String usuario, String... roles) {
        Instant ahora = Instant.now();
        return Jwts.builder().subject(usuario).claim("uid", 99).claim("roles", List.of(roles))
                .issuedAt(Date.from(ahora)).expiration(Date.from(ahora.plus(Duration.ofHours(1))))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRETO_DE_PRUEBA)), Jwts.SIG.HS384).compact();
    }

    private String admin() { return token("admin", "USER", "ADMIN"); }

    private String vendedor() { return token("vendedor1", "USER"); }

    private MockHttpServletRequestBuilder con(MockHttpServletRequestBuilder peticion, String token, String json) {
        MockHttpServletRequestBuilder b = peticion.header("Authorization", "Bearer " + token);
        return json == null ? b : b.contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private long crearProveedor(String nombre) throws Exception {
        String cuerpo = mvc.perform(con(post("/api/proveedores"), admin(),
                        "{\"nombre\":\"" + nombre + "\",\"telefono\":\"3001234567\",\"correo\":\"v@p.co\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(cuerpo, "$.id")).longValue();
    }

    private void crearProducto(String codigo, String precio, boolean iva, int stock, long proveedorId) throws Exception {
        mvc.perform(con(post("/api/productos"), admin(), "{\"codigo\":\"" + codigo + "\",\"nombre\":\"Producto " + codigo
                        + "\",\"precioBase\":" + precio + ",\"aplicaIva\":" + iva + ",\"stockInicial\":" + stock
                        + ",\"proveedorId\":" + proveedorId + "}"))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Sin token o con token falso: 401")
    void sinCredencialesEs401() throws Exception {
        mvc.perform(get("/api/productos")).andExpect(status().isUnauthorized());
        mvc.perform(con(get("/api/productos"), "token.falso.aqui", null)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un USER consulta y vende, pero no administra el catálogo, ni compra, ni ve reportes: 403")
    void usuarioNormalNoAdministra() throws Exception {
        String user = vendedor();
        mvc.perform(con(get("/api/productos"), user, null)).andExpect(status().isOk());
        mvc.perform(con(post("/api/productos"), user, "{\"codigo\":\"X-001\"}")).andExpect(status().isForbidden());
        mvc.perform(con(post("/api/proveedores"), user, "{\"nombre\":\"X\"}")).andExpect(status().isForbidden());
        mvc.perform(con(put("/api/productos/X-001"), user, "{}")).andExpect(status().isForbidden());
        mvc.perform(con(get("/api/compras"), user, null)).andExpect(status().isForbidden());
        mvc.perform(con(get("/api/productos/X-001/comparacion-precios"), user, null)).andExpect(status().isForbidden());
        mvc.perform(con(get("/api/reportes/ventas-diarias?fecha=2026-10-20"), user, null)).andExpect(status().isForbidden());
        mvc.perform(con(post("/api/facturas/FAC-2026-000001/anulacion"), user, "{\"motivo\":\"x\"}")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Datos faltantes o inválidos: 400 con el mensaje del dominio")
    void datosInvalidos() throws Exception {
        mvc.perform(con(post("/api/productos"), admin(), "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").exists());
        mvc.perform(con(post("/api/productos"), admin(), "esto no es json")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Crear un producto sin unidad de medida usa UNIDAD por defecto")
    void crearProductoSinUnidadUsaUnidadPorDefecto() throws Exception {
        long prov = crearProveedor("Proveedor unidad " + System.nanoTime());
        mvc.perform(con(post("/api/productos"), admin(), "{\"codigo\":\"UNI-01\",\"nombre\":\"Producto UNI-01\","
                        + "\"precioBase\":1000,\"aplicaIva\":true,\"stockInicial\":1,\"proveedorId\":" + prov + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.unidadMedida").value("UNIDAD"));
        mvc.perform(con(get("/api/productos/UNI-01"), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unidadMedida").value("UNIDAD"));
    }

    @Test
    @DisplayName("Crear un producto con una unidad de medida fuera del catálogo devuelve 400")
    void crearProductoConUnidadInvalidaDevuelve400() throws Exception {
        long prov = crearProveedor("Proveedor unidad inválida " + System.nanoTime());
        mvc.perform(con(post("/api/productos"), admin(), "{\"codigo\":\"UNI-02\",\"nombre\":\"Producto UNI-02\","
                        + "\"precioBase\":1000,\"aplicaIva\":true,\"stockInicial\":1,\"proveedorId\":" + prov
                        + ",\"unidadMedida\":\"DOCENA\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value(org.hamcrest.Matchers.containsString("unidad de medida")));
        mvc.perform(con(get("/api/productos/UNI-02"), admin(), null)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Editar cambia la unidad de medida y la conserva cuando se omite")
    void editarProductoCambiaUnidadYLaConservaSiSeOmite() throws Exception {
        long prov = crearProveedor("Proveedor edición unidad " + System.nanoTime());
        crearProducto("UNI-03", "1000", true, 5, prov);

        mvc.perform(con(put("/api/productos/UNI-03"), admin(), "{\"nombre\":\"Producto UNI-03\",\"precioBase\":1000,"
                        + "\"aplicaIva\":true,\"proveedorId\":" + prov + ",\"unidadMedida\":\"CAJA\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unidadMedida").value("CAJA"));

        mvc.perform(con(put("/api/productos/UNI-03"), admin(), "{\"nombre\":\"Producto UNI-03\",\"precioBase\":1000,"
                        + "\"aplicaIva\":true,\"proveedorId\":" + prov + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unidadMedida").value("CAJA"));
    }

    @Test
    @DisplayName("Flujo completo: proveedor, producto, venta, stock, anulación, compra, comparación y reporte")
    void flujoCompleto() throws Exception {
        long prov = crearProveedor("Distribuidora Rest " + System.nanoTime());
        crearProducto("MAR-900", "25000", true, 10, prov);

        mvc.perform(con(get("/api/productos/MAR-900"), vendedor(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.precioFinal").value(29750.0))
                .andExpect(jsonPath("$.stock").value(10))
                .andExpect(jsonPath("$.stockBajo").value(false))
                .andExpect(jsonPath("$.unidadMedida").value("UNIDAD"));

        // Código repetido: 409
        mvc.perform(con(post("/api/productos"), admin(), "{\"codigo\":\"mar-900\",\"nombre\":\"Repetido\",\"precioBase\":1,"
                + "\"aplicaIva\":false,\"stockInicial\":1,\"proveedorId\":" + prov + "}")).andExpect(status().isConflict());

        // Venta del USER: IVA 19 % sobre 2 x 25.000
        String venta = "{\"clienteNombre\":\"Ana Perez\",\"items\":[{\"codigo\":\"MAR-900\",\"cantidad\":2}]}";
        String respuesta = mvc.perform(con(post("/api/facturas"), vendedor(), venta))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("EMITIDA"))
                .andExpect(jsonPath("$.subtotal").value(50000.0))
                .andExpect(jsonPath("$.iva").value(9500.0))
                .andExpect(jsonPath("$.total").value(59500.0))
                .andExpect(jsonPath("$.vendedor").value("vendedor1"))
                .andReturn().getResponse().getContentAsString();
        String numero = JsonPath.read(respuesta, "$.numero");

        mvc.perform(con(get("/api/productos/MAR-900"), admin(), null)).andExpect(jsonPath("$.stock").value(8));

        // El PDF de la factura
        mvc.perform(con(get("/api/facturas/" + numero + "/pdf"), vendedor(), null))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));

        // Stock insuficiente: 409, con el detalle de lo que falta, y el stock no cambia
        mvc.perform(con(post("/api/facturas"), vendedor(),
                        "{\"clienteNombre\":\"Ana Perez\",\"items\":[{\"codigo\":\"MAR-900\",\"cantidad\":99}]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detalles.length()").value(1));
        mvc.perform(con(get("/api/productos/MAR-900"), admin(), null)).andExpect(jsonPath("$.stock").value(8));

        // Anulación (solo ADMIN): devuelve el stock; la segunda vez, 409
        mvc.perform(con(post("/api/facturas/" + numero + "/anulacion"), admin(), "{\"motivo\":\"Error en el pedido\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ANULADA"))
                .andExpect(jsonPath("$.motivoAnulacion").value("Error en el pedido"));
        mvc.perform(con(get("/api/productos/MAR-900"), admin(), null)).andExpect(jsonPath("$.stock").value(10));
        mvc.perform(con(post("/api/facturas/" + numero + "/anulacion"), admin(), "{\"motivo\":\"Otra vez\"}"))
                .andExpect(status().isConflict());
        mvc.perform(con(get("/api/facturas/FAC-2026-999999"), admin(), null)).andExpect(status().isNotFound());

        // Compra (solo ADMIN): sube el stock y alimenta la comparación de precios
        String compra = "{\"proveedorId\":" + prov + ",\"items\":[{\"codigo\":\"MAR-900\",\"cantidad\":5,\"precioCompra\":18000}]}";
        mvc.perform(con(post("/api/compras"), admin(), compra))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(90000.0))
                .andExpect(jsonPath("$.codigo").exists());
        mvc.perform(con(get("/api/productos/MAR-900"), admin(), null)).andExpect(jsonPath("$.stock").value(15));
        mvc.perform(con(get("/api/productos/MAR-900/comparacion-precios"), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ofertas[0].ultimoPrecio").value(18000.0))
                .andExpect(jsonPath("$.ofertas[0].esMenor").value(true));

        // Reporte diario del día de Bogotá (la venta anulada no suma) y su PDF
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Bogota"));
        mvc.perform(con(get("/api/reportes/ventas-diarias?fecha=" + hoy), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facturasAnuladas").exists());
        mvc.perform(con(get("/api/reportes/ventas-diarias/pdf?fecha=" + hoy), admin(), null))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    }

    @Test
    @DisplayName("T3.5, RF-17: la tendencia de ventas devuelve un punto por día; rango inválido 400 y USER 403")
    void tendenciaDeVentas() throws Exception {
        mvc.perform(con(get("/api/reportes/tendencia-ventas?dias=7"), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(7))
                .andExpect(jsonPath("$.puntos.length()").value(7))
                .andExpect(jsonPath("$.desde").exists())
                .andExpect(jsonPath("$.hasta").exists())
                .andExpect(jsonPath("$.total").exists());
        mvc.perform(con(get("/api/reportes/tendencia-ventas"), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.puntos.length()").value(90));
        mvc.perform(con(get("/api/reportes/tendencia-ventas?dias=0"), admin(), null))
                .andExpect(status().isBadRequest());
        mvc.perform(con(get("/api/reportes/tendencia-ventas?dias=91"), admin(), null))
                .andExpect(status().isBadRequest());
        mvc.perform(con(get("/api/reportes/tendencia-ventas?dias=7"), vendedor(), null))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("El seed deja el inicio listo: ventas de hoy, stock bajo y tendencia con datos")
    void seedRellenaElInicio() throws Exception {
        mvc.perform(con(post("/api/seed"), admin(), null)).andExpect(status().isCreated());

        LocalDate hoy = LocalDate.now(ZoneId.of("America/Bogota"));
        mvc.perform(con(get("/api/reportes/ventas-diarias?fecha=" + hoy), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facturasEmitidas").value(6))
                .andExpect(jsonPath("$.facturasAnuladas").value(1))
                .andExpect(jsonPath("$.productos").isNotEmpty());

        mvc.perform(con(get("/api/productos?soloActivos=true&bajoStock=true"), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(6));

        mvc.perform(con(get("/api/reportes/tendencia-ventas?dias=30"), admin(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.puntos.length()").value(30))
                .andExpect(jsonPath("$.puntos[29].facturasEmitidas").value(6))
                .andExpect(jsonPath("$.puntos[29].total").isNumber());
    }

    @Test
    @DisplayName("Una búsqueda sin resultados responde 200 con un mensaje claro, no un error")
    void busquedaSinResultados() throws Exception {
        mvc.perform(con(get("/api/productos?q=zzzz-no-existe"), vendedor(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.mensaje").value("No se encontraron productos"));
    }

    @Test
    @DisplayName("Las listas se paginan con pagina y tamano y devuelven el total")
    void paginacion() throws Exception {
        String marca = "PAG" + (System.nanoTime() % 100000);
        long prov = crearProveedor("Proveedor " + marca);
        crearProducto(marca + "-01", "1000", false, 1, prov);
        crearProducto(marca + "-02", "1000", false, 1, prov);
        crearProducto(marca + "-03", "1000", false, 1, prov);

        mvc.perform(con(get("/api/productos?q=" + marca + "&pagina=1&tamano=2"), vendedor(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.pagina").value(1))
                .andExpect(jsonPath("$.tamano").value(2))
                .andExpect(jsonPath("$.totalPaginas").value(2))
                .andExpect(jsonPath("$.productos.length()").value(2));

        mvc.perform(con(get("/api/productos?q=" + marca + "&pagina=2&tamano=2"), vendedor(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productos.length()").value(1))
                .andExpect(jsonPath("$.productos[0].codigo").value(marca + "-03"));

        mvc.perform(con(get("/api/proveedores?q=" + marca + "&pagina=1&tamano=1"), vendedor(), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.proveedores.length()").value(1));

        mvc.perform(con(get("/api/productos?pagina=0"), vendedor(), null))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Desactivar un producto lo saca de la venta (409) y activarlo lo devuelve")
    void productoDesactivado() throws Exception {
        long prov = crearProveedor("Proveedor Estado " + System.nanoTime());
        crearProducto("EST-01", "1000", false, 5, prov);
        mvc.perform(con(post("/api/productos/EST-01/desactivar"), admin(), null))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(false));
        String venta = "{\"clienteNombre\":\"Ana Perez\",\"items\":[{\"codigo\":\"EST-01\",\"cantidad\":1}]}";
        mvc.perform(con(post("/api/facturas"), vendedor(), venta)).andExpect(status().isConflict());
        mvc.perform(con(post("/api/productos/EST-01/activar"), admin(), null)).andExpect(status().isOk());
        mvc.perform(con(post("/api/facturas"), vendedor(), venta)).andExpect(status().isCreated());
    }
}
