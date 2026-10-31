package co.edu.unipamplona.ferreteria.application.service;

import co.edu.unipamplona.ferreteria.application.port.in.CompraDetalle;
import co.edu.unipamplona.ferreteria.application.port.in.CompraUseCase;
import co.edu.unipamplona.ferreteria.application.port.in.command.ConsultarComprasQuery;
import co.edu.unipamplona.ferreteria.application.port.in.command.ItemCompraCommand;
import co.edu.unipamplona.ferreteria.application.port.in.command.RegistrarCompraCommand;
import co.edu.unipamplona.ferreteria.application.port.out.*;
import co.edu.unipamplona.ferreteria.domain.exception.*;
import co.edu.unipamplona.ferreteria.domain.model.*;
import co.edu.unipamplona.ferreteria.domain.service.PoliticaAcceso;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/** Compras a proveedores: guardar la compra y subir el stock es una sola transacción (HU-10). */
public class CompraService implements CompraUseCase {

    private final CompraRepositoryPort compras;
    private final ProveedorRepositoryPort proveedores;
    private final ProductoRepositoryPort productos;
    private final TransaccionPort transaccion;
    private final Clock reloj;
    private final PoliticaAcceso acceso;

    public CompraService(CompraRepositoryPort compras, ProveedorRepositoryPort proveedores, ProductoRepositoryPort productos,
                         TransaccionPort transaccion, Clock reloj, PoliticaAcceso acceso) {
        this.compras = compras;
        this.proveedores = proveedores;
        this.productos = productos;
        this.transaccion = transaccion;
        this.reloj = reloj;
        this.acceso = acceso;
    }

    @Override
    public CompraDetalle registrar(Actor actor, RegistrarCompraCommand c) {
        acceso.asegurarAdmin(actor, "registrar compras");
        Validacion.exigir("proveedor", c.proveedorId(), "productos", c.items());
        LocalDate hoy = LocalDate.now(reloj);
        LocalDate fecha = c.fecha() == null || c.fecha().isBlank() ? hoy : Fechas.leer(c.fecha(), "fecha de la compra");
        List<ItemCompraCommand> items = c.items();
        for (ItemCompraCommand i : items) {
            if (i == null) throw new ValorInvalidoException("Hay un producto vacío en la compra");
            Validacion.exigir("código del producto", i.codigo(), "cantidad", i.cantidad(), "precio de compra", i.precioCompra());
        }
        return transaccion.ejecutar(() -> {
            Proveedor proveedor = proveedores.buscarPorId(c.proveedorId())
                    .orElseThrow(() -> new ProveedorNoEncontradoException(c.proveedorId()));
            List<String> codigos = new ArrayList<>();
            for (ItemCompraCommand i : items) codigos.add(Producto.normalizarCodigo(i.codigo()));
            Map<String, Producto> porCodigo = new LinkedHashMap<>();
            for (Producto p : productos.buscarPorCodigosBloqueando(codigos.stream().distinct().sorted().toList())) {
                porCodigo.put(p.getCodigo(), p);
            }
            List<String> faltan = codigos.stream().distinct().filter(k -> !porCodigo.containsKey(k)).toList();
            if (!faltan.isEmpty()) throw new ProductoNoEncontradoException(faltan);

            List<LineaCompra> lineas = new ArrayList<>();
            for (int k = 0; k < items.size(); k++) {
                Producto p = porCodigo.get(codigos.get(k));
                p.asegurarActivo("comprar");
                ItemCompraCommand i = items.get(k);
                lineas.add(new LineaCompra(p.getCodigo(), p.getNombre(), i.cantidad(), preciode(i)));
            }
            Instant ahora = reloj.instant();
            Compra compra = Compra.registrar(proveedor.getId(), fecha, hoy, actor.username(), ahora, lineas);
            for (LineaCompra l : lineas) {
                Producto p = porCodigo.get(l.codigoProducto());
                p.reponer(l.cantidad(), actor.username(), ahora);
                productos.guardar(p);
            }
            return new CompraDetalle(compras.guardar(compra), proveedor.getNombre());
        });
    }

    private static Dinero preciode(ItemCompraCommand i) {
        if (i.precioCompra().signum() <= 0) {
            throw new ValorInvalidoException("El precio de compra de " + i.codigo().trim().toUpperCase(Locale.ROOT)
                    + " debe ser mayor que cero");
        }
        return Dinero.de(i.precioCompra());
    }

    @Override
    public CompraDetalle consultar(Actor actor, String codigo) {
        acceso.asegurarAdmin(actor, "consultar compras");
        Validacion.exigir("código de la compra", codigo);
        long id = Compra.leerCodigo(codigo);
        Compra compra = compras.buscarPorId(id).orElseThrow(() -> new CompraNoEncontradaException(Compra.codigoDe(id)));
        return conNombre(List.of(compra)).get(0);
    }

    @Override
    public List<CompraDetalle> listar(Actor actor, ConsultarComprasQuery q) {
        acceso.asegurarAdmin(actor, "consultar compras");
        LocalDate desde = q.desde() == null || q.desde().isBlank() ? null : Fechas.leer(q.desde(), "fecha inicial");
        LocalDate hasta = q.hasta() == null || q.hasta().isBlank() ? null : Fechas.leer(q.hasta(), "fecha final");
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new ValorInvalidoException("La fecha inicial no puede ser posterior a la final");
        }
        String codigo = q.codigoProducto() == null || q.codigoProducto().isBlank() ? null : Producto.normalizarCodigo(q.codigoProducto());
        return conNombre(compras.buscar(new FiltroCompras(q.proveedorId(), desde, hasta, codigo)));
    }

    private List<CompraDetalle> conNombre(List<Compra> lista) {
        Set<Long> ids = new HashSet<>();
        lista.forEach(c -> ids.add(c.getProveedorId()));
        Map<Long, String> nombres = new HashMap<>();
        proveedores.buscarPorIds(ids).forEach(p -> nombres.put(p.getId(), p.getNombre()));
        List<CompraDetalle> r = new ArrayList<>();
        for (Compra c : lista) r.add(new CompraDetalle(c, nombres.getOrDefault(c.getProveedorId(), "Proveedor " + c.getProveedorId())));
        return r;
    }
}
