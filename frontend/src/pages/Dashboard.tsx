import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarProductos } from '../api/catalogo'
import type { BusquedaProductosResponse, ReporteDiarioResponse, TendenciaVentasResponse, VentaDiariaResponse } from '../api/domain'
import { reporteDiario, tendenciaVentas } from '../api/reportes'
import { useAuth } from '../auth/useAuth'
import { MensajeError } from '../components/FormFields'
import { formatearDia, formatearDiaCorto, hoyEnBogota } from '../lib/fecha'
import { formatearPesos, formatearPesosCompacto } from '../lib/formato'
import { Button } from '../components/ui/button'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Trophy, BarChart3, Calculator, Hash } from 'lucide-react'

const DIA = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })

/** Productos que se muestran en "Stock bajo"; coincide con Producto.UMBRAL_STOCK_BAJO del backend. */
const UMBRAL_STOCK_BAJO = 5
const TAMANO_MUESTRA_STOCK = 6
const TAMANO_MUESTRA_VENDIDOS = 6

const RANGOS = [
  { dias: 90, etiqueta: 'Últimos 3 meses' },
  { dias: 30, etiqueta: 'Últimos 30 días' },
  { dias: 7, etiqueta: 'Últimos 7 días' },
] as const

type Resultado<T> = { datos?: T; error?: string } | null
type ResultadoSerie = { dias: number; datos?: TendenciaVentasResponse; error?: string } | null

export function Dashboard() {
  const { user, hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const [dias, setDias] = useState<number>(90)
  const [stock, setStock] = useState<Resultado<BusquedaProductosResponse>>(null)
  const [hoy, setHoy] = useState<Resultado<ReporteDiarioResponse>>(null)
  const [serie, setSerie] = useState<ResultadoSerie>(null)
  const [revision, setRevision] = useState(0)
  const [fecha] = useState(() => DIA.format(new Date()).replace(/^./, c => c.toUpperCase()))

  // Volver a la pestaña después de correr el seed debe mostrar los datos nuevos, sin recargar a mano.
  const ultimoRefresco = useRef(0)
  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState !== 'visible') return
      const ahora = Date.now()
      if (ahora - ultimoRefresco.current < 1000) return
      ultimoRefresco.current = ahora
      setRevision(r => r + 1)
    }
    window.addEventListener('visibilitychange', refrescar)
    window.addEventListener('focus', refrescar)
    return () => {
      window.removeEventListener('visibilitychange', refrescar)
      window.removeEventListener('focus', refrescar)
    }
  }, [])

  useEffect(() => {
    let vigente = true
    buscarProductos({ soloActivos: true, bajoStock: true, pagina: 1, tamano: TAMANO_MUESTRA_STOCK })
      .then(datos => vigente && setStock({ datos }))
      .catch(e => vigente && setStock({ error: e instanceof Error ? e.message : 'No se pudo consultar el stock' }))
    return () => {
      vigente = false
    }
  }, [revision])

  useEffect(() => {
    if (!esAdmin) return
    let vigente = true
    reporteDiario(hoyEnBogota())
      .then(datos => vigente && setHoy({ datos }))
      .catch(e => vigente && setHoy({ error: e instanceof Error ? e.message : 'No se pudo consultar el día' }))
    return () => {
      vigente = false
    }
  }, [esAdmin, revision])

  useEffect(() => {
    if (!esAdmin) return
    let vigente = true
    tendenciaVentas(dias)
      .then(datos => vigente && setSerie({ dias, datos }))
      .catch(e => vigente && setSerie({ dias, error: e instanceof Error ? e.message : 'No se pudo consultar la tendencia' }))
    return () => {
      vigente = false
    }
  }, [esAdmin, dias, revision])

  const bajos = [...(stock?.datos?.productos ?? [])].sort((a, b) => a.stock - b.stock)
  const totalBajos = stock?.datos?.total ?? 0
  const reporte = hoy?.datos
  const masVendidos = [...(reporte?.productos ?? [])]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, TAMANO_MUESTRA_VENDIDOS)

  const actual = serie?.dias === dias ? serie : null
  const tendencia = actual?.datos
  const puntos = tendencia?.puntos ?? []
  const rango = RANGOS.find(r => r.dias === dias) ?? RANGOS[0]
  const promedio = tendencia && puntos.length ? tendencia.total / puntos.length : 0
  const mejor = puntos.reduce<VentaDiariaResponse | null>(
    (mayor, p) => (mayor === null || p.total > mayor.total ? p : mayor), null)
  const resumen = tendencia
    ? `Ventas por día del ${formatearDia(tendencia.desde)} al ${formatearDia(tendencia.hasta)}. ` +
      `Total vendido ${formatearPesos(tendencia.total)}; promedio diario ${formatearPesos(promedio)}.` +
      (mejor && mejor.total > 0 ? ` Mejor día: ${formatearDia(mejor.fecha)} con ${formatearPesos(mejor.total)}.` : '')
    : ''

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
          <p className="text-sm text-muted-foreground">
            {esAdmin ? 'Ventas de hoy y stock bajo' : 'Productos bajos en stock'} · {fecha} · {user?.username}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="default" className="min-h-[44px]">
            <Link to="/vender" className="!text-foreground">Nueva venta</Link>
          </Button>
          <Button asChild variant="secondary" size="default" className="min-h-[44px]">
            <Link to="/productos" className="!text-foreground">Buscar producto</Link>
          </Button>
        </div>
      </div>

      {esAdmin && (
        <section aria-labelledby="titulo-hoy" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="titulo-hoy" className="text-lg font-semibold">Ventas de hoy</h2>
          </div>
          <MensajeError mensaje={hoy?.error ?? null} />
          {!hoy && <div className="skeleton h-24 w-full" aria-hidden="true" />}
          {reporte && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0 overflow-hidden rounded-lg border border-border bg-card divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className={cn('p-3 md:p-5 min-w-0', reporte.total === 0 && 'opacity-60')}>
                <dt className="text-xs text-muted-foreground">Total vendido</dt>
                <dd className="mt-1.5 text-2xl font-bold tabular-nums text-primary truncate">{formatearPesos(reporte.total)}</dd>
              </div>
              <div className="p-3 md:p-5 min-w-0">
                <dt className="text-xs text-muted-foreground">Facturas emitidas</dt>
                <dd className="mt-1.5 text-2xl font-bold tabular-nums truncate">{reporte.facturasEmitidas}</dd>
              </div>
              <div className="p-3 md:p-5 min-w-0">
                <dt className="text-xs text-muted-foreground">Unidades vendidas</dt>
                <dd className="mt-1.5 text-2xl font-bold tabular-nums truncate">{reporte.unidadesVendidas}</dd>
              </div>
              <div className="p-3 md:p-5 min-w-0">
                <dt className="text-xs text-muted-foreground">Facturas anuladas</dt>
                <dd className="mt-1.5 text-2xl font-bold tabular-nums truncate">{reporte.facturasAnuladas}</dd>
              </div>
            </dl>
          )}
        </section>
      )}

      {esAdmin && (
        <Card className="pt-0">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle id="titulo-tendencia" className="text-lg">Tendencia de ventas</CardTitle>
              <CardDescription>Total facturado por día · {rango.etiqueta.toLowerCase()}</CardDescription>
            </div>
            <Select value={String(dias)} onValueChange={valor => setDias(Number(valor))}>
              <SelectTrigger className="w-full rounded-lg sm:ml-auto sm:w-[180px]" aria-label="Seleccionar rango">
                <SelectValue placeholder={rango.etiqueta} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {RANGOS.map(r => (
                  <SelectItem key={r.dias} value={String(r.dias)} className="rounded-lg">{r.etiqueta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <MensajeError mensaje={actual?.error ?? null} />
            {!actual && <div className="h-[200px] w-full skeleton sm:h-[250px]" aria-hidden="true" />}
            {tendencia?.mensaje && (
              <p className="py-12 text-center text-sm text-muted-foreground">{tendencia.mensaje}</p>
            )}
            {tendencia && !tendencia.mensaje && (
              <figure aria-labelledby="titulo-tendencia" className="m-0">
                <div className="aspect-auto h-[200px] w-full sm:h-[250px]" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={puntos} accessibilityLayer>
                      <defs>
                        <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="fecha"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        tickFormatter={formatearDiaCorto}
                      />
                      <YAxis
                        width={64}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'auto']}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        tickFormatter={valor => formatearPesosCompacto(Number(valor))}
                      />
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        labelFormatter={valor => formatearDia(String(valor))}
                        formatter={valor => [formatearPesos(Number(valor)), 'Total vendido']}
                      />
                      <Area
                        dataKey="total"
                        name="Total vendido"
                        type="monotone"
                        fill="url(#fillVentas)"
                        stroke="var(--foreground)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <figcaption className="sr-only">{resumen}</figcaption>
              </figure>
            )}
            {tendencia && !tendencia.mensaje && (
              <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Total del periodo</dt>
                  <dd className="text-sm font-semibold tabular-nums truncate">{formatearPesos(tendencia.total)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Promedio diario</dt>
                  <dd className="text-sm font-semibold tabular-nums truncate">{formatearPesos(promedio)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Mejor día</dt>
                  <dd className="text-sm font-semibold tabular-nums truncate">
                    {mejor && mejor.total > 0
                      ? `${formatearDiaCorto(mejor.fecha)} · ${formatearPesos(mejor.total)}`
                      : 'Sin ventas'}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section aria-labelledby="titulo-stock" className="rounded-lg border border-border bg-card p-3 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="titulo-stock" className="text-lg font-semibold">Stock bajo</h2>
            {bajos.length > 0 && (
              <Button asChild variant="outline" size="default" className="min-h-[44px]">
                <Link to="/productos" className="!text-foreground">{totalBajos > TAMANO_MUESTRA_STOCK ? `Ver los ${totalBajos}` : 'Ir al catálogo'}</Link>
              </Button>
            )}
          </div>
          <MensajeError mensaje={stock?.error ?? null} />
          {!stock && <div className="skeleton h-20 w-full" aria-hidden="true" />}
          {stock?.datos && bajos.length === 0 && (
            <p className="text-sm text-muted-foreground">Ningún producto activo tiene {UMBRAL_STOCK_BAJO} unidades o menos.</p>
          )}
          {bajos.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {bajos.slice(0, TAMANO_MUESTRA_STOCK).map(p => (
                <li key={p.codigo} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 min-w-0">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.nombre}</span>
                    <span className="block text-xs text-muted-foreground truncate">{p.codigo} · {p.proveedorNombre}</span>
                  </span>
                  <span className="shrink-0">
                    {p.stock === 0 ? <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Agotado</span> : <><strong className="tabular-nums">{p.stock}</strong> <span className="text-xs text-muted-foreground">unid.</span></>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {esAdmin && (
          <section aria-labelledby="titulo-vendidos" className="rounded-lg border border-border bg-card p-3 md:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="titulo-vendidos" className="text-lg font-semibold">Más vendidos hoy</h2>
              <Button asChild variant="outline" size="default" className="min-h-[44px]">
                <Link to="/reporte" className="!text-foreground">Ver reporte</Link>
              </Button>
            </div>
            {!hoy && <div className="skeleton h-20 w-full" aria-hidden="true" />}
            {reporte && masVendidos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-muted-foreground">{reporte.mensaje ?? 'Aún no hay ventas registradas hoy.'}</p>
              </div>
            )}
            {masVendidos.length > 0 && reporte && (
              <div className="flex flex-col gap-4">
                <ul className="flex flex-col gap-2.5 w-full">
                  {masVendidos.map(p => {
                    const max = masVendidos[0].cantidad
                    const pct = max > 0 ? (p.cantidad / max) * 100 : 0
                    return (
                      <li key={p.codigo} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center text-sm min-w-0">
                        <span className="truncate font-medium min-w-0">{p.nombre}</span>
                        <div className="h-2 rounded-full bg-muted overflow-hidden min-w-0">
                          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tabular-nums font-semibold shrink-0">{p.cantidad}</span>
                      </li>
                    )
                  })}
                </ul>
                {(() => {
                  const topTotal = masVendidos.reduce((acc, p) => acc + p.cantidad, 0)
                  const topPct = reporte.unidadesVendidas ? Math.round((topTotal / reporte.unidadesVendidas) * 100) : null
                  const promedio = masVendidos.length ? Math.round(topTotal / masVendidos.length) : 0
                  const lider = masVendidos[0]
                  const liderPct = reporte.unidadesVendidas ? Math.round((lider.cantidad / reporte.unidadesVendidas) * 100) : null
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
                      <div className="rounded-md bg-muted/40 p-2 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Trophy className="h-3.5 w-3.5 shrink-0" />
                          <p className="text-[11px] truncate">Top 1</p>
                        </div>
                        <p className="text-sm font-semibold truncate">{lider.nombre}</p>
                        <p className="text-xs tabular-nums text-muted-foreground truncate">{lider.cantidad} unid.{liderPct !== null ? ` · ${liderPct}%` : ''}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                          <p className="text-[11px] truncate">Top {masVendidos.length}</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums truncate">{topTotal} unid.</p>
                        <p className="text-xs tabular-nums text-muted-foreground truncate">{topPct !== null ? `${topPct}% del día` : 'del día'}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calculator className="h-3.5 w-3.5 shrink-0" />
                          <p className="text-[11px] truncate">Promedio</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums truncate">{promedio} unid.</p>
                        <p className="text-xs tabular-nums text-muted-foreground truncate">por producto</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Hash className="h-3.5 w-3.5 shrink-0" />
                          <p className="text-[11px] truncate">Items</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums truncate">{masVendidos.length}</p>
                        <p className="text-xs tabular-nums text-muted-foreground truncate">en el top</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  )
}
