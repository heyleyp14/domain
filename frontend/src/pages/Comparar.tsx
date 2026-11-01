import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { compararPrecios } from '../api/comparacion'
import type { ComparacionResponse, ProductoResponse } from '../api/domain'
import { BuscadorProductos } from '../components/BuscadorProductos'
import { MensajeError } from '../components/FormFields'
import { Card } from '../components/ui/card'
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
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Comparar precios entre proveedores</h1>
        <p className="text-sm text-muted-foreground">Consulta el precio vigente y el histórico de cada proveedor.</p>
      </header>

      <Card className="p-4">
        {/* Inactive products are included: their purchase history is still useful for deciding. */}
        <BuscadorProductos label="Producto a comparar" onElegir={setProducto} soloActivos={false} autoFocus />
      </Card>

      {codigo && !actual && (
        <>
          <p className="sr-only">Comparando...</p>
          <div className="skeleton h-40 w-full" aria-hidden="true" />
        </>
      )}
      <MensajeError mensaje={actual?.error ?? null} />

      {!codigo && (
        <Card className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Elige un producto para comparar</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Verás el precio vigente, el menor histórico y las compras registradas a cada proveedor.
          </p>
        </Card>
      )}

      {comparacion && (
        <Card role="region" aria-label={`Comparación de ${comparacion.codigoProducto}`} className="flex flex-col gap-4 p-4">
          <h2 className="text-base font-semibold">{comparacion.codigoProducto} · {comparacion.nombreProducto}</h2>

          {comparacion.ofertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">{comparacion.mensaje ?? 'Este producto aún no tiene compras registradas'}</p>
          ) : (
            <>
              {menores.length > 0 && (
                <p role="status" className="rounded-md border border-border bg-[var(--pill-positive-bg)] px-3 py-2 text-sm text-[var(--pill-positive-ink)]">
                  {menores.length === 1
                    ? `Menor precio vigente: ${menores[0].proveedorNombre}, ${formatearPesos(menores[0].ultimoPrecio)}`
                    : `Empate en el menor precio vigente (${formatearPesos(menores[0].ultimoPrecio)}): ${menores.map(m => m.proveedorNombre).join(', ')}`}
                </p>
              )}

              <div className="overflow-x-auto rounded-md border border-border">
                <table aria-label="Precios por proveedor" className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                      <th className="px-3 py-2 text-right font-medium">Precio vigente</th>
                      <th className="px-3 py-2 text-left font-medium">Fecha de la última compra</th>
                      <th className="px-3 py-2 text-right font-medium">Menor precio histórico</th>
                      <th className="px-3 py-2 text-right font-medium">Compras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {comparacion.ofertas.map(o => (
                      <tr key={o.proveedorId} className={o.esMenor ? 'bg-primary/5' : undefined}>
                        <td className="px-3 py-2">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {o.proveedorNombre}
                            {o.esMenor && (
                              <span className="inline-flex items-center rounded-full bg-[var(--pill-positive-bg)] px-2 py-0.5 text-xs font-medium text-[var(--pill-positive-ink)]">
                                Menor precio
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(o.ultimoPrecio)}</td>
                        <td className="px-3 py-2">{formatearDia(o.fechaUltimaCompra)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatearPesos(o.menorPrecioHistorico)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{o.compras}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                El precio vigente es el de la compra más reciente a cada proveedor. Se muestra también el menor precio que ha cobrado.
              </p>
            </>
          )}
        </Card>
      )}
    </section>
  )
}
