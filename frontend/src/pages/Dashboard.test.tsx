import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReporteDiarioResponse, TendenciaVentasResponse, VentaDiariaResponse } from '../api/domain'
import { formatearPesos } from '../lib/formato'
import { busqueda, json, producto, servidorFalso } from '../test/servidor'
import { renderApp, tokenDePrueba } from '../test/utilidades'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })
const VENDEDOR = tokenDePrueba()

const HOY = '2026-11-01'

const reporte: ReporteDiarioResponse = {
  fecha: HOY, mensaje: null, facturasEmitidas: 2, facturasAnuladas: 1, unidadesVendidas: 7,
  subtotal: 100000, iva: 19000, total: 119000,
  productosTotal: 2, paginaProductos: 1, tamanoProductos: 20, totalPaginasProductos: 1,
  facturasTotal: 2, paginaFacturas: 1, tamanoFacturas: 20, totalPaginasFacturas: 1,
  productos: [
    { codigo: 'MAR-01', nombre: 'Martillo de uña', cantidad: 5, subtotal: 90000, iva: 17100, total: 107100 },
    { codigo: 'CLA-01', nombre: 'Clavos 2 pulgadas', cantidad: 2, subtotal: 10000, iva: 1900, total: 11900 },
  ],
  facturas: [],
}

function fechaHace(diasAtras: number): string {
  const dia = new Date(`${HOY}T00:00:00Z`)
  dia.setUTCDate(dia.getUTCDate() - diasAtras)
  return dia.toISOString().slice(0, 10)
}

/** Misma forma que el backend: un punto por día, con ceros donde no hubo ventas. */
function serie(dias: number): TendenciaVentasResponse {
  const ventas = [50000, 200000, 100000]
  const puntos: VentaDiariaResponse[] = Array.from({ length: dias }, (_, i) => {
    const atras = dias - 1 - i
    const total = ventas[atras] ?? 0
    return { fecha: fechaHace(atras), total, facturasEmitidas: total > 0 ? 1 : 0, unidadesVendidas: total > 0 ? 2 : 0 }
  })
  const total = puntos.reduce((suma, p) => suma + p.total, 0)
  return {
    desde: fechaHace(dias - 1), hasta: HOY, dias, total,
    mensaje: total > 0 ? null : 'No se registraron ventas en el periodo consultado',
    puntos,
  }
}

function servidor(extra: Record<string, (url: URL, init: RequestInit) => Response | Promise<Response>> = {}) {
  return servidorFalso({
    'GET /api/productos': json(200, busqueda([
      producto('CLA-01', { nombre: 'Clavos 2 pulgadas', stock: 0, stockBajo: true }),
      producto('BRO-01', { nombre: 'Brocha 3 pulgadas', stock: 2, stockBajo: true }),
    ])),
    'GET /api/reportes/ventas-diarias': json(200, reporte),
    'GET /api/reportes/tendencia-ventas': url => json(200, serie(Number(url.searchParams.get('dias'))))(),
    ...extra,
  })
}

describe('Inicio (T3.5, RF-17)', () => {
  it('muestra las ventas de hoy y la tendencia que entrega el servidor, no datos de ejemplo', async () => {
    const srv = servidor()
    renderApp('/', ADMIN)

    expect(await screen.findAllByText('Martillo de uña')).not.toHaveLength(0)
    expect(screen.getByText(/119\.000,00/)).toBeInTheDocument()
    expect(await screen.findByText('Total del periodo')).toBeInTheDocument()
    expect(screen.getAllByText(/350\.000,00/)).not.toHaveLength(0)
    expect(screen.getByText(/Total facturado por día · últimos 3 meses/i)).toBeInTheDocument()

    expect(screen.queryByText('Pintura Azul')).not.toBeInTheDocument()
    expect(screen.queryByText('Martillo 16oz')).not.toBeInTheDocument()
    expect(screen.queryByText('Tornillos 2"')).not.toBeInTheDocument()
    expect(srv.llamadasA('GET /api/reportes/tendencia-ventas')[0].url.searchParams.get('dias')).toBe('90')
  })

  it('vuelve a consultar al regresar a la pestaña, sin recargar a mano', async () => {
    const srv = servidor()
    renderApp('/', ADMIN)
    await screen.findByText('Total del periodo')
    expect(srv.llamadasA('GET /api/reportes/ventas-diarias')).toHaveLength(1)

    window.dispatchEvent(new Event('focus'))

    await waitFor(() => expect(srv.llamadasA('GET /api/reportes/ventas-diarias')).toHaveLength(2))
    expect(srv.llamadasA('GET /api/reportes/tendencia-ventas')).toHaveLength(2)
    expect(srv.llamadasA('GET /api/productos')).toHaveLength(2)
  })

  it('el selector de rango consulta de nuevo el periodo elegido', async () => {
    const srv = servidor()
    renderApp('/', ADMIN)
    await screen.findByText('Total del periodo')

    await userEvent.click(screen.getByRole('combobox', { name: 'Seleccionar rango' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Últimos 7 días' }))

    await waitFor(() => expect(srv.llamadasA('GET /api/reportes/tendencia-ventas')).toHaveLength(2))
    expect(srv.llamadasA('GET /api/reportes/tendencia-ventas')[1].url.searchParams.get('dias')).toBe('7')
    expect(await screen.findByText(/total facturado por día · últimos 7 días/i)).toBeInTheDocument()
  })

  it('describe la gráfica para lectores de pantalla con el total y el mejor día', async () => {
    servidor()
    renderApp('/', ADMIN)

    const figura = await screen.findByRole('figure', { name: 'Tendencia de ventas' })
    const resumen = within(figura).getByText(/Ventas por día del/)
    expect(resumen).toHaveTextContent('350.000,00')
    expect(resumen).toHaveTextContent('Mejor día')
  })

  it('no inventa ventas ni productos cuando el servidor falla', async () => {
    servidor({
      'GET /api/productos': json(500, { mensaje: 'No se pudo consultar el stock' }),
      'GET /api/reportes/ventas-diarias': json(500, { mensaje: 'No se pudo consultar el día' }),
      'GET /api/reportes/tendencia-ventas': json(500, { mensaje: 'No se pudo consultar la tendencia' }),
    })
    renderApp('/', ADMIN)

    expect(await screen.findByText('No se pudo consultar el día')).toBeInTheDocument()
    expect(screen.getByText('No se pudo consultar la tendencia')).toBeInTheDocument()
    expect(screen.getByText('No se pudo consultar el stock')).toBeInTheDocument()
    expect(screen.queryByText('Pintura Azul')).not.toBeInTheDocument()
    expect(screen.queryByText('Martillo 16oz')).not.toBeInTheDocument()
    expect(screen.queryByText(formatearPesos(1250000))).not.toBeInTheDocument()
    expect(screen.queryByText('Total del periodo')).not.toBeInTheDocument()
  })

  it('el vendedor solo ve el stock bajo y no consulta reportes', async () => {
    const srv = servidor()
    renderApp('/', VENDEDOR)

    expect(await screen.findByText('Brocha 3 pulgadas')).toBeInTheDocument()
    expect(screen.getByText(/Productos bajos en stock/)).toBeInTheDocument()
    expect(screen.queryByText('Ventas de hoy')).not.toBeInTheDocument()
    expect(screen.queryByText('Tendencia de ventas')).not.toBeInTheDocument()
    expect(srv.llamadasA('GET /api/reportes/tendencia-ventas')).toHaveLength(0)
    expect(srv.llamadasA('GET /api/reportes/ventas-diarias')).toHaveLength(0)
  })

  it('con el rango sin ventas muestra el mensaje del servidor y no una gráfica vacía', async () => {
    servidor({ 'GET /api/reportes/tendencia-ventas': json(200, { ...serie(7), total: 0, mensaje: 'No se registraron ventas en el periodo consultado', puntos: [] }) })
    renderApp('/', ADMIN)

    expect(await screen.findByText('No se registraron ventas en el periodo consultado')).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('consulta el reporte del día de Bogotá, aunque en UTC ya sea el día siguiente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T02:30:00Z')) // 1 Nov, 9:30 p.m. en Bogotá
    const srv = servidor()
    renderApp('/', tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] }))

    await waitFor(() => expect(srv.llamadasA('GET /api/reportes/ventas-diarias')).toHaveLength(1))
    expect(srv.llamadasA('GET /api/reportes/ventas-diarias')[0].url.searchParams.get('fecha')).toBe('2026-11-01')
  })
})
