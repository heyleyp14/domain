package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.CatalogoUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.ProductoDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.ProveedorDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.ProveedorDetallePaginado;
import co.edu.unipamplona.ferreteria.application.port.in.command.*;
import co.edu.unipamplona.ferreteria.application.port.out.*;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.Actor;
import co.edu.unipamplona.ferreteria.domain.model.Producto;
import co.edu.unipamplona.ferreteria.domain.model.Proveedor;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class CatalogoService implements CatalogoUseCase {

    private final ProveedorRepositoryPort proveedores;
    private final ProductoRepositoryPort productos;
    private final TransaccionPort transaccion;
    private final Clock reloj;
    private final PoliticaAcceso acceso;

    public CatalogoService(ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos, TransaccionPort transaccion,
                           Clock reloj, PoliticaAcceso acceso) {
        this.proveedores = proveedores;
        this.productos = productos;
        this.transaccion = transaccion;
        this.reloj = reloj;
        this.acceso = acceso;
    }

    // ---- proveedores ----

    @Override
    public Proveedor registrarProveedor(Actor actor, RegistrarProveedorCommand c) {
        acceso.asegurarAdmin(actor, "gestionar los proveedores");
        Validacion.exigir("nombre", c.nombre());
        return transaccion.ejecutar(() -> {
            Proveedor p = Proveedor.registrar(c.nombre(), c.telefono(), c.correo(), c.direccion(), actor.username(), reloj.instant());
            asegurarNombreLibre(p.getNombre(), null);
            return proveedores.guardar(p);
        });
    }

    @Override
    public Proveedor editarProveedor(Actor actor, EditarProveedorCommand c) {
        acceso.asegurarAdmin(actor, "gestionar los proveedores");
        Validacion.exigir("nombre", c.nombre());
        return transaccion.ejecutar(() -> {
            Proveedor p = proveedores.buscarPorId(c.id()).orElseThrow(() -> new ProveedorNoEncontradoException(c.id()));
            p.editar(c.nombre(), c.telefono(), c.correo(), c.direccion(), actor.username(), reloj.instant());
            asegurarNombreLibre(p.getNombre(), p.getId());
            return proveedores.guardar(p);
        });
    }

    @Override
    public ProveedorDetalle detalleProveedor(Actor actor, long id) {
        acceso.asegurarUsuario(actor);
        Proveedor p = proveedores.buscarPorId(id).orElseThrow(() -> new ProveedorNoEncontradoException(id));
        return new ProveedorDetalle(p, productos.buscarPorProveedor(id));
    }

    @Override
    public List<Proveedor> listarProveedores(Actor actor, String texto) {
        acceso.asegurarUsuario(actor);
        return proveedores.buscar(texto == null || texto.isBlank() ? null : texto.trim());
    }

    @Override
    public ProveedorDetallePaginado detalleProveedor(Actor actor, long id, Paginacion paginacion) {
        acceso.asegurarUsuario(actor);
        Proveedor p = proveedores.buscarPorId(id).orElseThrow(() -> new ProveedorNoEncontradoException(id));
        return new ProveedorDetallePaginado(p, productos.buscarPorProveedor(id, paginacion));
    }

    @Override
    public Pagina<Proveedor> listarProveedores(Actor actor, String texto, Paginacion paginacion) {
        acceso.asegurarUsuario(actor);
        return proveedores.buscar(texto == null || texto.isBlank() ? null : texto.trim(), paginacion);
    }

    private void asegurarNombreLibre(String nombre, Long idPropio) {
        proveedores.buscarPorNombre(Proveedor.normalizarNombre(nombre))
                .filter(otro -> idPropio == null || !otro.getId().equals(idPropio))
                .ifPresent(otro -> { throw new NombreProveedorDuplicadoException(nombre); });
    }

    // ---- productos ----

    @Override
    public ProductoDetalle registrarProducto(Actor actor, RegistrarProductoCommand c) {
        acceso.asegurarAdmin(actor, "gestionar el catálogo de productos");
        Validacion.exigir("código", c.codigo(), "nombre", c.nombre(), "precio", c.precioBase(), "aplica IVA", c.aplicaIva(),
                "stock inicial", c.stockInicial(), "proveedor", c.proveedorId());
        return transaccion.ejecutar(() -> {
            Producto p = Producto.registrar(c.codigo(), c.nombre(), c.precioBase(), c.aplicaIva(), c.stockInicial(), c.proveedorId(),
                    c.unidadMedida(), actor.username(), reloj.instant());
            Proveedor prov = proveedorExistente(p.getProveedorId());
            if (productos.buscarPorCodigo(p.getCodigo()).isPresent()) throw new CodigoProductoDuplicadoException(p.getCodigo());
            return new ProductoDetalle(productos.guardar(p), prov);
        });
    }

    @Override
    public ProductoDetalle editarProducto(Actor actor, EditarProductoCommand c) {
        acceso.asegurarAdmin(actor, "gestionar el catálogo de productos");
        Validacion.exigir("código", c.codigo(), "nombre", c.nombre(), "precio", c.precioBase(), "aplica IVA", c.aplicaIva(),
                "proveedor", c.proveedorId());
        return transaccion.ejecutar(() -> {
            Producto p = productoExistente(c.codigo());
            p.editar(c.nombre(), c.precioBase(), c.aplicaIva(), c.proveedorId(), c.unidadMedida(), actor.username(),
                    reloj.instant());
            Proveedor prov = proveedorExistente(p.getProveedorId());
            return new ProductoDetalle(productos.guardar(p), prov);
        });
    }

    @Override
    public ProductoDetalle desactivarProducto(Actor actor, String codigo) {
        acceso.asegurarAdmin(actor, "desactivar productos");
        Validacion.exigir("código", codigo);
        return transaccion.ejecutar(() -> {
            Producto p = productoExistente(codigo);
            p.desactivar(actor.username(), reloj.instant());
            return new ProductoDetalle(productos.guardar(p), proveedorExistente(p.getProveedorId()));
        });
    }

    @Override
    public ProductoDetalle activarProducto(Actor actor, String codigo) {
        acceso.asegurarAdmin(actor, "activar productos");
        Validacion.exigir("código", codigo);
        return transaccion.ejecutar(() -> {
            Producto p = productoExistente(codigo);
            p.activar(actor.username(), reloj.instant());
            return new ProductoDetalle(productos.guardar(p), proveedorExistente(p.getProveedorId()));
        });
    }

    @Override
    public ProductoDetalle detalleProducto(Actor actor, String codigo) {
        acceso.asegurarUsuario(actor);
        Validacion.exigir("código", codigo);
        Producto p = productoExistente(codigo);
        return new ProductoDetalle(p, proveedorExistente(p.getProveedorId()));
    }

    @Override
    public List<ProductoDetalle> buscarProductos(Actor actor, BuscarProductosQuery q) {
        acceso.asegurarUsuario(actor);
        String texto = q.texto() == null || q.texto().isBlank() ? null : q.texto().trim();
        Set<Long> proveedoresCoincidentes = new HashSet<>();
        if (texto != null) proveedores.buscar(texto).forEach(p -> proveedoresCoincidentes.add(p.getId()));
        List<Producto> encontrados = productos.buscar(new FiltroProductos(texto, Boolean.TRUE.equals(q.soloActivos()),
                Boolean.TRUE.equals(q.bajoStock()), proveedoresCoincidentes));
        Set<Long> ids = new HashSet<>();
        encontrados.forEach(p -> ids.add(p.getProveedorId()));
        Map<Long, Proveedor> porId = new HashMap<>();
        proveedores.buscarPorIds(ids).forEach(p -> porId.put(p.getId(), p));
        List<ProductoDetalle> r = new ArrayList<>();
        for (Producto p : encontrados) r.add(new ProductoDetalle(p, porId.get(p.getProveedorId())));
        return r;
    }

    @Override
    public Pagina<ProductoDetalle> buscarProductos(Actor actor, BuscarProductosQuery q, Paginacion paginacion) {
        acceso.asegurarUsuario(actor);
        String texto = q.texto() == null || q.texto().isBlank() ? null : q.texto().trim();
        Set<Long> proveedoresCoincidentes = new HashSet<>();
        if (texto != null) proveedores.buscar(texto).forEach(p -> proveedoresCoincidentes.add(p.getId()));
        Pagina<Producto> pagina = productos.buscar(new FiltroProductos(texto, Boolean.TRUE.equals(q.soloActivos()),
                Boolean.TRUE.equals(q.bajoStock()), proveedoresCoincidentes), paginacion);
        Set<Long> ids = new HashSet<>();
        pagina.contenido().forEach(p -> ids.add(p.getProveedorId()));
        Map<Long, Proveedor> porId = new HashMap<>();
        proveedores.buscarPorIds(ids).forEach(p -> porId.put(p.getId(), p));
        List<ProductoDetalle> r = new ArrayList<>();
        for (Producto p : pagina.contenido()) r.add(new ProductoDetalle(p, porId.get(p.getProveedorId())));
        return new Pagina<>(r, pagina.total(), pagina.pagina(), pagina.tamano());
    }

    private Producto productoExistente(String codigo) {
        String normalizado = Producto.normalizarCodigo(codigo);
        return productos.buscarPorCodigo(normalizado).orElseThrow(() -> new ProductoNoEncontradoException(normalizado));
    }

    private Proveedor proveedorExistente(long id) {
        return proveedores.buscarPorId(id).orElseThrow(() -> new ProveedorNoEncontradoException(id));
    }
}
