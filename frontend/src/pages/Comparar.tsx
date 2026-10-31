import { useEffect, useState } from 'react'
import { compararPrecios } from '../api/comparacion'
import type { ComparacionResponse, ProductoResponse } from '../api/domain'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { MensajeError } from '../components/FormFields'
import { formatearDia } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'

/**
 * Price comparison between suppliers (HU-11, RF-19). ADMIN only: the route is wrapped in <SoloAdmin>.
 * The order and the "lowest price" marks come from the server; on a tie every tied supplier is marked.
 */
export function Comparar() {
  const [producto, setProducto] = useState<ProductoResponse | null>(null)
  const [respuesta, setRespuesta] = useState<{ codigo: string; r?: ComparacionResponse; error?: string } | null>(null)
  const codigo = producto?.codigo ?? null

  useEffect(() => {
    if (!codigo) return
    let vigente = true
    compararPrecios(codigo)
      .then(r => vigente && setRespuesta({ codigo, r }))
      .catch(e => vigente && setRespuesta({ codigo, error: e instanceof Error ? e.message : 'No se pudo comparar' }))
    return () => {
      vigente = false
    }
  }, [codigo])

  const actual = codigo && respuesta?.codigo === codigo ? respuesta : null
  const comparacion = actual?.r
  const menores = comparacion?.ofertas.filter(o => o.esMenor) ?? []

  return (
    <section className="pagina">
      <h1>Comparar precios entre proveedores</h1>
      {/* Inactive products are included: their purchase history is still useful for deciding. */}
      <BuscadorProductos label="Producto a comparar" onElegir={setProducto} soloActivos={false} autoFocus />

      {codigo && !actual && <p className="loading">Comparando...</p>}
      <MensajeError mensaje={actual?.error ?? null} />

      {comparacion && (
        <div className="card" role="region" aria-label={`Comparación de ${comparacion.codigoProducto}`}>
          <h2>{comparacion.codigoProducto} · {comparacion.nombreProducto}</h2>
          {comparacion.ofertas.length === 0 ? (
            <p className="sin-resultados">{comparacion.mensaje ?? 'Este producto aún no tiene compras registradas'}</p>
          ) : (
            <>
              <p className="aviso" role="status">
                {menores.length === 1
                  ? `Menor precio vigente: ${menores[0].proveedorNombre}, ${formatearPesos(menores[0].ultimoPrecio)}`
                  : `Empate en el menor precio vigente (${formatearPesos(menores[0].ultimoPrecio)}): ${menores.map(m => m.proveedorNombre).join(', ')}`}
              </p>
              <div className="table-container">
                <table aria-label="Precios por proveedor">
                  <thead>
                    <tr><th>Proveedor</th><th className="numero">Precio vigente</th><th>Fecha de la última compra</th><th className="numero">Menor precio histórico</th><th className="numero">Compras</th></tr>
                  </thead>
                  <tbody>
                    {comparacion.ofertas.map(o => (
                      <tr key={o.proveedorId} className={o.esMenor ? 'destacada' : undefined}>
                        <td>{o.proveedorNombre} {o.esMenor && <span className="badge badge-success">Menor precio</span>}</td>
                        <td className="numero">{formatearPesos(o.ultimoPrecio)}</td>
                        <td>{formatearDia(o.fechaUltimaCompra)}</td>
                        <td className="numero">{formatearPesos(o.menorPrecioHistorico)}</td>
                        <td className="numero">{o.compras}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ayuda-campo">
                El precio vigente es el de la compra más reciente a cada proveedor. Se muestra también el menor precio que ha cobrado.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
