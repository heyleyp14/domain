import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarProductos } from '../api/catalogo'
import type { BusquedaProductosResponse, ReporteDiarioResponse } from '../api/domain'
// import { reporteDiario } from '../api/reportes'
import { useAuth } from '../auth/useAuth'
import { MensajeError } from '../components/FormFields'
// import { hoyEnBogota } from '../lib/fecha'
import { formatearPesos } from '../lib/formato'
import { Button } from '../components/ui/button'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { Trophy, BarChart3, Calculator, Hash } from 'lucide-react'

const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  { date: "2024-04-03", desktop: 167, mobile: 120 },
  { date: "2024-04-04", desktop: 242, mobile: 260 },
  { date: "2024-04-05", desktop: 373, mobile: 290 },
  { date: "2024-04-06", desktop: 301, mobile: 340 },
  { date: "2024-04-07", desktop: 245, mobile: 180 },
  { date: "2024-04-08", desktop: 409, mobile: 320 },
  { date: "2024-04-09", desktop: 59, mobile: 110 },
  { date: "2024-04-10", desktop: 261, mobile: 190 },
  { date: "2024-04-11", desktop: 327, mobile: 350 },
  { date: "2024-04-12", desktop: 292, mobile: 210 },
  { date: "2024-04-13", desktop: 342, mobile: 380 },
  { date: "2024-04-14", desktop: 137, mobile: 220 },
  { date: "2024-04-15", desktop: 120, mobile: 170 },
]

const DIA = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })
const MAXIMO_STOCK_BAJO = 6

type Resultado<T> = { datos?: T; error?: string } | null

export function Dashboard() {
  const { user, hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const [stock, setStock] = useState<Resultado<BusquedaProductosResponse>>(null)
  const [hoy] = useState<Resultado<ReporteDiarioResponse>>(null)
  const [fecha] = useState(() => DIA.format(new Date()).replace(/^./, c => c.toUpperCase()))

  useEffect(() => {
    let vigente = true
    buscarProductos({ soloActivos: true, bajoStock: true })
      .then(datos => vigente && setStock({ datos }))
      .catch(e => vigente && setStock({ error: e instanceof Error ? e.message : 'No se pudo consultar el stock' }))
    if (esAdmin) {
      // reporteDiario(hoyEnBogota())
      //   .then(datos => vigente && setHoy({ datos }))
      //   .catch(e => vigente && setHoy({ error: e instanceof Error ? e.message : 'No se pudo consultar el día' }))
    }
    return () => {
      vigente = false
    }
  }, [esAdmin])

  const bajos = [...(stock?.datos?.productos ?? [
    { codigo: 'P010', nombre: 'Clavos 2"', stock: 0, proveedorNombre: 'Proveedor A' },
    { codigo: 'P011', nombre: 'Pintura Azul', stock: 2, proveedorNombre: 'Proveedor B' },
    { codigo: 'P012', nombre: 'Brocha 3"', stock: 1, proveedorNombre: 'Proveedor C' },
  ])].sort((a, b) => a.stock - b.stock)
  const reporte = hoy?.datos ?? {
    total: 1250000,
    facturasEmitidas: 8,
    unidadesVendidas: 45,
    facturasAnuladas: 1,
    productos: [
      { codigo: 'P001', nombre: 'Martillo 16oz', cantidad: 12 },
      { codigo: 'P002', nombre: 'Tornillos 2"', cantidad: 45 },
      { codigo: 'P003', nombre: 'Pintura Blanca 1G', cantidad: 8 },
      { codigo: 'P004', nombre: 'Cinta Métrica 5m', cantidad: 15 },
      { codigo: 'P005', nombre: 'Alicate Universal', cantidad: 6 },
    ],
  }
  const masVendidos = [...(reporte?.productos ?? [])].sort((a, b) => b.cantidad - a.cantidad).slice(0, 6)

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
              <CardTitle>Tendencia de ventas</CardTitle>
              <CardDescription>Mostrando visitas totales de los últimos 3 meses</CardDescription>
            </div>
            <Select defaultValue="90d">
              <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Seleccionar rango">
                <SelectValue placeholder="Últimos 3 meses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">Últimos 3 meses</SelectItem>
                <SelectItem value="30d" className="rounded-lg">Últimos 30 días</SelectItem>
                <SelectItem value="7d" className="rounded-lg">Últimos 7 días</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="aspect-auto h-[200px] sm:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString("es-CO", { month: "short", day: "numeric" })
                    }}
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
                    labelFormatter={(value: any) => new Date(value).toLocaleDateString("es-CO", { month: "short", day: "numeric" })}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="url(#fillMobile)"
                    stroke="var(--foreground)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="url(#fillDesktop)"
                    stroke="var(--foreground)"
                    stackId="a"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section aria-labelledby="titulo-stock" className="rounded-lg border border-border bg-card p-3 md:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="titulo-stock" className="text-lg font-semibold">Stock bajo</h2>
            {bajos.length > 0 && (
              <Button asChild variant="outline" size="default" className="min-h-[44px]">
                <Link to="/productos" className="!text-foreground">{bajos.length > MAXIMO_STOCK_BAJO ? `Ver los ${bajos.length}` : 'Ir al catálogo'}</Link>
              </Button>
            )}
          </div>
          <MensajeError mensaje={stock?.error ?? null} />
          {!stock && <div className="h-20 w-full animate-pulse rounded-md bg-muted" aria-hidden="true" />}
          {stock?.datos && bajos.length === 0 && (
            <p className="text-sm text-muted-foreground">Ningún producto activo tiene 5 unidades o menos.</p>
          )}
          {bajos.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {bajos.slice(0, MAXIMO_STOCK_BAJO).map(p => (
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
            {/* {!hoy && <div className="h-20 w-full animate-pulse rounded-md bg-muted" aria-hidden="true" />} */}
            {reporte && masVendidos.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <p className="text-sm text-muted-foreground">Aún no hay ventas registradas hoy.</p>
                        </div>
                      )}
            {masVendidos.length > 0 && (
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
                  const topPct = reporte?.unidadesVendidas ? Math.round((topTotal / reporte.unidadesVendidas) * 100) : null
                  const promedio = masVendidos.length ? Math.round(topTotal / masVendidos.length) : 0
                  const lider = masVendidos[0]
                  const liderPct = reporte?.unidadesVendidas ? Math.round((lider.cantidad / reporte.unidadesVendidas) * 100) : null
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