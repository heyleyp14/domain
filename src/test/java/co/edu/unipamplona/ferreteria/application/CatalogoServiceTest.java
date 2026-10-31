package co.edu.unipamplona.ferreteria.application;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.ferreteria.application.port.in.ProductoDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.ProveedorDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.command.*;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.testsupport.Datos;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CatalogoServiceTest {

    private final Escenario e = new Escenario();

    private RegistrarProductoCommand nuevo(String codigo, Long proveedorId) {
        return new RegistrarProductoCommand(codigo, "Martillo de uña", new BigDecimal("25000"), true, 12, proveedorId);
    }

    // ---- proveedores ----

    @Test
    @DisplayName("El administrador registra un proveedor y queda consultable con quién lo creó")
    void registraProveedor() {
        Proveedor p = e.catalogo.registrarProveedor(e.admin(), new RegistrarProveedorCommand("Aceros del Norte", "3001234567", "v@aceros.co", "Av. 1"));
        assertNotNull(p.getId());
        assertEquals("Aceros del Norte", e.catalogo.detalleProveedor(e.vendedor(), p.getId()).proveedor().getNombre());
        assertEquals("admin@murano3d.co", p.getAuditoria().creadoPor());
    }

    @Test
    @DisplayName("No se repite el nombre de un proveedor (sin importar mayúsculas ni espacios) y sí se puede editar sin chocar consigo mismo")
    void nombreDeProveedorUnico() {
        Proveedor a = e.proveedor("Aceros del Norte");
        assertThrows(NombreProveedorDuplicadoException.class, () -> e.proveedor("  ACEROS   del norte "));
        Proveedor b = e.proveedor("Bodega Central");
        assertThrows(NombreProveedorDuplicadoException.class,
                () -> e.catalogo.editarProveedor(e.admin(), new EditarProveedorCommand(b.getId(), "aceros del norte", "3001234567", null, null)));
        Proveedor editado = e.catalogo.editarProveedor(e.admin(), new EditarProveedorCommand(a.getId(), "ACEROS DEL NORTE", "3009998877", null, null));
        assertEquals("ACEROS DEL NORTE", editado.getNombre());
    }

    @Test
    @DisplayName("Un proveedor sin ningún dato de contacto se rechaza con 400")
    void proveedorSinContacto() {
        assertThrows(ValorInvalidoException.class,
                () -> e.catalogo.registrarProveedor(e.admin(), new RegistrarProveedorCommand("Aceros", null, null, "Av. 1")));
        assertThrows(ValorInvalidoException.class,
                () -> e.catalogo.registrarProveedor(e.admin(), new RegistrarProveedorCommand("", "3001234567", null, null)));
    }

    @Test
    @DisplayName("El detalle del proveedor muestra los productos que suministra")
    void proveedorConSusProductos() {
        Proveedor a = e.proveedor("Aceros del Norte");
        Proveedor b = e.proveedor("Bodega Central");
        e.producto("MAR-01", "25000", true, 5, a);
        e.producto("CLA-01", "100", false, 500, a);
        e.producto("PIN-01", "40000", true, 5, b);
        ProveedorDetalle d = e.catalogo.detalleProveedor(e.vendedor(), a.getId());
        assertEquals(2, d.productos().size());
        assertThrows(ProveedorNoEncontradoException.class, () -> e.catalogo.detalleProveedor(e.vendedor(), 999));
    }

    @Test
    @DisplayName("Listar proveedores filtra por nombre y ordena alfabéticamente")
    void listaProveedores() {
        e.proveedor("Zinc SA");
        e.proveedor("Aceros del Norte");
        assertEquals(List.of("Aceros del Norte", "Zinc SA"),
                e.catalogo.listarProveedores(e.vendedor(), null).stream().map(Proveedor::getNombre).toList());
        assertEquals(1, e.catalogo.listarProveedores(e.vendedor(), "zinc").size());
    }

    // ---- productos ----

    @Test
    @DisplayName("Crea un producto con código, nombre, precio, IVA, stock y proveedor, y lo devuelve con su precio final")
    void registraProducto() {
        Proveedor prov = e.proveedor("Aceros del Norte");
        ProductoDetalle d = e.catalogo.registrarProducto(e.admin(), nuevo("mar-01", prov.getId()));
        assertNotNull(d.producto().getId());
        assertEquals("MAR-01", d.producto().getCodigo());
        assertEquals(12, d.producto().getStock());
        assertEquals(Dinero.de("29750.00"), d.producto().precioFinal());
        assertEquals("Aceros del Norte", d.proveedor().getNombre());
    }

    @Test
    @DisplayName("No permite repetir el código de un producto, aunque cambie la escritura")
    void codigoUnico() {
        Proveedor prov = e.proveedor("Aceros del Norte");
        e.catalogo.registrarProducto(e.admin(), nuevo("MAR-01", prov.getId()));
        assertThrows(CodigoProductoDuplicadoException.class, () -> e.catalogo.registrarProducto(e.admin(), nuevo(" mar-01 ", prov.getId())));
    }

    @Test
    @DisplayName("El proveedor del producto debe existir (404) y los datos faltantes se listan todos (400)")
    void proveedorExistenteYDatosObligatorios() {
        assertThrows(ProveedorNoEncontradoException.class, () -> e.catalogo.registrarProducto(e.admin(), nuevo("MAR-01", 999L)));
        ValorInvalidoException ex = assertThrows(ValorInvalidoException.class, () -> e.catalogo.registrarProducto(e.admin(),
                new RegistrarProductoCommand(null, "", null, null, null, null)));
        assertTrue(ex.getMessage().contains("código") && ex.getMessage().contains("nombre") && ex.getMessage().contains("precio")
                && ex.getMessage().contains("IVA") && ex.getMessage().contains("stock") && ex.getMessage().contains("proveedor"));
    }

    @Test
    @DisplayName("Rechaza precio negativo y stock inicial negativo antes de guardar")
    void rechazaNegativos() {
        Proveedor prov = e.proveedor("Aceros del Norte");
        assertThrows(ValorInvalidoException.class, () -> e.catalogo.registrarProducto(e.admin(),
                new RegistrarProductoCommand("A1", "Clavo", new BigDecimal("-1"), true, 1, prov.getId())));
        assertThrows(ValorInvalidoException.class, () -> e.catalogo.registrarProducto(e.admin(),
                new RegistrarProductoCommand("A1", "Clavo", new BigDecimal("1"), true, -1, prov.getId())));
        assertTrue(e.productos.buscarPorCodigo("A1").isEmpty());
    }

    @Test
    @DisplayName("Editar cambia nombre, precio, IVA y proveedor, pero no el stock")
    void editaProducto() {
        Proveedor a = e.proveedor("Aceros del Norte");
        Proveedor b = e.proveedor("Bodega Central");
        e.catalogo.registrarProducto(e.admin(), nuevo("MAR-01", a.getId()));
        e.avanzar(java.time.Duration.ofHours(2));
        ProductoDetalle d = e.catalogo.editarProducto(Datos.admin(), new EditarProductoCommand("mar-01", "Martillo carpintero",
                new BigDecimal("27000"), false, b.getId()));
        assertEquals("Martillo carpintero", d.producto().getNombre());
        assertEquals(Dinero.de("27000.00"), d.producto().precioFinal());
        assertEquals("Bodega Central", d.proveedor().getNombre());
        assertEquals(12, d.producto().getStock());
        assertEquals(Datos.AHORA.plusSeconds(7200), d.producto().getAuditoria().modificadoEn());
        assertThrows(ProductoNoEncontradoException.class, () -> e.catalogo.editarProducto(e.admin(),
                new EditarProductoCommand("NO-EXISTE", "X1", new BigDecimal("1"), true, a.getId())));
        assertThrows(ProveedorNoEncontradoException.class, () -> e.catalogo.editarProducto(e.admin(),
                new EditarProductoCommand("MAR-01", "Martillo", new BigDecimal("1"), true, 999L)));
    }

    @Test
    @DisplayName("Desactivar y activar un producto; repetir la operación es un conflicto")
    void desactivaYActiva() {
        Proveedor a = e.proveedor("Aceros del Norte");
        e.catalogo.registrarProducto(e.admin(), nuevo("MAR-01", a.getId()));
        assertFalse(e.catalogo.desactivarProducto(e.admin(), "MAR-01").producto().isActivo());
        assertThrows(EstadoInvalidoException.class, () -> e.catalogo.desactivarProducto(e.admin(), "MAR-01"));
        assertTrue(e.catalogo.activarProducto(e.admin(), "mar-01").producto().isActivo());
        assertThrows(EstadoInvalidoException.class, () -> e.catalogo.activarProducto(e.admin(), "MAR-01"));
        assertThrows(ProductoNoEncontradoException.class, () -> e.catalogo.desactivarProducto(e.admin(), "XX-99"));
    }

    @Test
    @DisplayName("Solo el administrador gestiona el catálogo (403); el vendedor puede consultar")
    void permisos() {
        Proveedor a = e.proveedor("Aceros del Norte");
        e.producto("MAR-01", "25000", true, 5, a);
        assertThrows(AccesoDenegadoException.class, () -> e.catalogo.registrarProducto(e.vendedor(), nuevo("X1", a.getId())));
        assertThrows(AccesoDenegadoException.class, () -> e.catalogo.desactivarProducto(e.vendedor(), "MAR-01"));
        assertThrows(AccesoDenegadoException.class, () -> e.catalogo.registrarProveedor(e.vendedor(), new RegistrarProveedorCommand("Z1", "3001234567", null, null)));
        assertEquals("MAR-01", e.catalogo.detalleProducto(e.vendedor(), "mar-01").producto().getCodigo());
        Actor sinRol = Actor.de("alguien@murano3d.co", List.of("OTRO"));
        assertThrows(AccesoDenegadoException.class, () -> e.catalogo.detalleProducto(sinRol, "MAR-01"));
        assertThrows(AccesoDenegadoException.class, () -> e.catalogo.buscarProductos(sinRol, new BuscarProductosQuery(null, null, null)));
    }

    // ---- búsqueda (HU-3 del grupo) ----

    @Test
    @DisplayName("Busca por código, por nombre o por proveedor, sin distinguir mayúsculas")
    void busca() {
        Proveedor aceros = e.proveedor("Aceros del Norte");
        Proveedor pinturas = e.proveedor("Pinturas Cúcuta");
        e.catalogo.registrarProducto(e.admin(), new RegistrarProductoCommand("MAR-01", "Martillo de uña", new BigDecimal("25000"), true, 8, aceros.getId()));
        e.catalogo.registrarProducto(e.admin(), new RegistrarProductoCommand("PIN-BL", "Pintura blanca galón", new BigDecimal("80000"), true, 3, pinturas.getId()));
        e.catalogo.registrarProducto(e.admin(), new RegistrarProductoCommand("CLA-02", "Clavo de acero", new BigDecimal("100"), false, 500, aceros.getId()));

        assertEquals(List.of("MAR-01"), codigos(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("mar-0", null, null))));
        assertEquals(List.of("CLA-02"), codigos(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("CLAVO", null, null))));
        assertEquals(List.of("MAR-01", "CLA-02").stream().sorted().toList(),
                codigos(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("aceros", null, null))).stream().sorted().toList());
        assertEquals(List.of("PIN-BL"), codigos(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("cúcuta", null, null))));
        assertEquals(3, e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery(null, null, null)).size());
        assertEquals(3, e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("   ", null, null)).size());
    }

    @Test
    @DisplayName("Sin coincidencias devuelve una lista vacía (no un error)")
    void sinCoincidencias() {
        e.producto("MAR-01", "25000", true, 5, e.proveedor("Aceros del Norte"));
        assertTrue(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("zzz", null, null)).isEmpty());
    }

    @Test
    @DisplayName("Los resultados traen precio, IVA, precio final, stock y proveedor, y se pueden filtrar por activos y stock bajo")
    void resultadosYFiltros() {
        Proveedor a = e.proveedor("Aceros del Norte");
        e.producto("A-ALTO", "1000", true, 50, a);
        e.producto("B-BAJO", "2000", false, 5, a);
        e.producto("C-CERO", "3000", true, 0, a);
        e.catalogo.desactivarProducto(e.admin(), "C-CERO");
        List<ProductoDetalle> bajos = e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery(null, null, true));
        assertEquals(List.of("B-BAJO", "C-CERO"), codigos(bajos));
        assertEquals(List.of("A-ALTO", "B-BAJO"), codigos(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery(null, true, null))));
        assertEquals(List.of("B-BAJO"), codigos(e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery(null, true, true))));
        ProductoDetalle alto = e.catalogo.buscarProductos(e.vendedor(), new BuscarProductosQuery("A-ALTO", null, null)).get(0);
        assertEquals(Dinero.de("1190.00"), alto.producto().precioFinal());
        assertEquals("Aceros del Norte", alto.proveedor().getNombre());
    }

    private List<String> codigos(List<ProductoDetalle> r) { return r.stream().map(d -> d.producto().getCodigo()).toList(); }
}
