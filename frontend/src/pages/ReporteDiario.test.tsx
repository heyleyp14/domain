import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FacturaResponse, ReporteDiarioResponse } from '../api/domain'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { json, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })

const reporte: ReporteDiarioResponse = {
  fecha: '2026-10-30', mensaje: null, facturasEmitidas: 1, facturasAnuladas: 1, unidadesVendidas: 2,
  subtotal: 50000, iva: 9500, total: 59500,
  productos: [{ codigo: 'MAR-01', nombre: 'Martillo de uña', cantidad: 2, subtotal: 50000, iva: 9500, total: 59500 }],
  facturas: [
    { numero: 'FAC-2026-000007', fecha: '2026-10-31T01:15:00Z', cliente: 'Ana Pérez', vendedor: 'vendedor1', total: 59500, anulada: false },
    { numero: 'FAC-2026-000008', fecha: '2026-10-30T15:00:00Z', cliente: 'Luis Gómez', vendedor: 'vendedor2', total: 11900, anulada: true },
  ],
}
const vacio: ReporteDiarioResponse = {
  ...reporte, fecha: '2026-10-29', mensaje: 'No se registraron ventas en esta fecha', facturasEmitidas: 0, facturasAnuladas: 0,
  unidadesVendidas: 0, subtotal: 0, iva: 0, total: 0, productos: [], facturas: [],
}

function servidor(extra = {}) {
  return servidorFalso({
    'GET /api/reportes/ventas-diarias': url => json(200, url.searchParams.get('fecha') === '2026-10-29' ? vacio : reporte)(),
    ...extra,
  })
}

describe('Reporte diario (T3.8, HU-12, RF-17)', () => {
  it('consulta el día de Bogotá por defecto, aunque en UTC ya sea el día siguiente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T02:30:00Z')) // 30 Oct, 9:30 p.m. in Bogotá
    const srv = servidor()
    renderApp('/reporte', ADMIN)
    await screen.findByRole('region', { name: 'Reporte del 2026-10-30' })
    expect(srv.llamadasA('GET /api/reportes/ventas-diarias')[0].url.searchParams.get('fecha')).toBe('2026-10-30')
  })

  it('muestra totales, productos y facturas; las anuladas se marcan y se cuentan', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-30T20:00:00Z'))
    servidor()
    renderApp('/reporte', ADMIN)
    const region = await screen.findByRole('region', { name: 'Reporte del 2026-10-30' })

    const resumen = Object.fromEntries(
      within(region).getAllByRole('term').map(dt => [dt.textContent, dt.nextElementSibling?.textContent]),
    )
    expect(resumen['Total vendido']).toMatch(/59\.500,00/)
    expect(resumen['Facturas emitidas']).toBe('1')
    expect(resumen['Facturas anuladas']).toBe('1')
    expect(within(region).getByText(/no suman en los totales/)).toBeInTheDocument()

    const productos = within(within(region).getByRole('table', { name: 'Productos vendidos' }))
    expect(productos.getByText('Martillo de uña')).toBeInTheDocument()

    const facturas = within(region).getByRole('table', { name: 'Facturas del día' })
    const anulada = within(facturas).getByText('FAC-2026-000008').closest('tr')!
    expect(within(anulada).getByText('Anulada')).toBeInTheDocument()
    expect(within(facturas).getByText('FAC-2026-000007').closest('tr')).toHaveTextContent('vendedor1')
  })

  it('cada factura enlaza a su detalle en Facturas', async () => {
    const factura: FacturaResponse = {
      numero: 'FAC-2026-000007', fecha: '2026-10-31T01:15:00Z', estado: 'EMITIDA', clienteNombre: 'Ana Pérez', clienteDireccion: null,
      clienteTelefono: null, vendedor: 'vendedor1', lineas: [], subtotal: 50000, iva: 9500, total: 59500,
      anuladaPor: null, anuladaEn: null, motivoAnulacion: null,
    }
    servidor({ 'GET /api/facturas/FAC-2026-000007': json(200, factura) })
    renderApp('/reporte', ADMIN)
    await userEvent.click(await screen.findByRole('link', { name: 'FAC-2026-000007' }))
    expect(await screen.findByRole('article', { name: 'Factura FAC-2026-000007' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Facturas' })).toBeInTheDocument()
  })

  it('un día sin ventas muestra el mensaje del servidor, no un error', async () => {
    const srv = servidor()
    renderApp('/reporte', ADMIN)
    await screen.findByRole('region')
    const fecha = screen.getByLabelText('Fecha')
    await userEvent.clear(fecha)
    await userEvent.type(fecha, '2026-10-29')

    const region = await screen.findByRole('region', { name: 'Reporte del 2026-10-29' })
    expect(region).toHaveTextContent('No se registraron ventas en esta fecha')
    expect(within(region).queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(srv.llamadasA('GET /api/reportes/ventas-diarias').at(-1)!.url.searchParams.get('fecha')).toBe('2026-10-29'))
  })

  it('descarga el PDF del día con el nombre que da el servidor', async () => {
    servidor({
      'GET /api/reportes/ventas-diarias/pdf': () =>
        new Response(new Blob(['%PDF-1.4']), { status: 200, headers: { 'Content-Disposition': 'inline; filename="reporte-ventas-2026-10-30.pdf"' } }),
    })
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:r'), configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderApp('/reporte', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1))
    expect((clic.mock.contexts[0] as HTMLAnchorElement).download).toBe('reporte-ventas-2026-10-30.pdf')
  })

  it('un USER que abre /reporte ve "No tiene permiso" y no se consulta nada', () => {
    const srv = servidorFalso({})
    renderApp('/reporte', tokenDePrueba({ roles: ['USER'] }))
    expect(screen.getByRole('heading', { name: 'No tiene permiso' })).toBeInTheDocument()
    expect(srv.llamadas).toHaveLength(0)
  })
})
