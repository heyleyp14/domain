import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ComparacionResponse, OfertaResponse } from '../api/domain'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { busqueda, json, producto, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })

const oferta = (proveedorId: number, proveedorNombre: string, ultimoPrecio: number, extra: Partial<OfertaResponse> = {}): OfertaResponse => ({
  proveedorId, proveedorNombre, ultimoPrecio, fechaUltimaCompra: '2026-10-20', menorPrecioHistorico: ultimoPrecio, compras: 1, esMenor: false, ...extra,
})

function servidor(comparacion: ComparacionResponse | null, status = 200) {
  return servidorFalso({
    'GET /api/productos': json(200, busqueda([producto('MAR-01', { nombre: 'Martillo de uña', activo: false })])),
    'GET /api/productos/MAR-01/comparacion-precios': json(status, comparacion ?? { status, mensaje: 'No existe el producto MAR-01', detalles: [] }),
  })
}

async function elegir() {
  await userEvent.type(screen.getByRole('combobox', { name: 'Producto a comparar' }), 'mar')
  await screen.findByRole('option', { name: /MAR-01/ })
  await userEvent.keyboard('{Enter}')
}

describe('Comparar precios (T3.7, HU-11, RF-19)', () => {
  it('muestra cada proveedor con su precio vigente, histórico, fecha y compras, y marca el menor', async () => {
    const srv = servidor({
      codigoProducto: 'MAR-01', nombreProducto: 'Martillo de uña', mensaje: null,
      ofertas: [
        oferta(2, 'Ferremax', 17500, { esMenor: true, menorPrecioHistorico: 16000, compras: 3, fechaUltimaCompra: '2026-10-28' }),
        oferta(1, 'Distribuidora Andina', 18000),
      ],
    })
    renderApp('/comparar', ADMIN)
    await elegir()

    const region = await screen.findByRole('region', { name: 'Comparación de MAR-01' })
    expect(within(region).getByRole('status')).toHaveTextContent('Menor precio vigente: Ferremax')
    const filas = within(region).getAllByRole('row').slice(1)
    expect(filas[0]).toHaveTextContent('Ferremax')
    expect(within(filas[0]).getByText('Menor precio')).toBeInTheDocument()
    expect(filas[0]).toHaveTextContent('17.500,00')
    expect(filas[0]).toHaveTextContent('16.000,00')
    expect(filas[0]).toHaveTextContent(/28[/ ](10|oct\.?)[/ ]2026/) // es-CO date; the exact style depends on the ICU data
    expect(within(filas[1]).queryByText('Menor precio')).not.toBeInTheDocument()
    // Inactive products are offered too (their history still matters).
    expect(srv.llamadasA('GET /api/productos')[0].url.searchParams.get('soloActivos')).toBeNull()
  })

  it('con un empate marca a todos los proveedores empatados', async () => {
    servidor({
      codigoProducto: 'MAR-01', nombreProducto: 'Martillo de uña', mensaje: null,
      ofertas: [oferta(1, 'Andina', 17500, { esMenor: true }), oferta(2, 'Ferremax', 17500, { esMenor: true }), oferta(3, 'Otro', 19000)],
    })
    renderApp('/comparar', ADMIN)
    await elegir()
    const region = await screen.findByRole('region', { name: 'Comparación de MAR-01' })
    expect(within(region).getAllByText('Menor precio')).toHaveLength(2)
    expect(within(region).getByRole('status')).toHaveTextContent('Empate en el menor precio vigente')
    expect(within(region).getByRole('status')).toHaveTextContent('Andina, Ferremax')
  })

  it('un producto sin compras muestra el mensaje del servidor, no un error', async () => {
    servidor({ codigoProducto: 'MAR-01', nombreProducto: 'Martillo de uña', mensaje: 'Este producto aún no tiene compras registradas', ofertas: [] })
    renderApp('/comparar', ADMIN)
    await elegir()
    const region = await screen.findByRole('region', { name: 'Comparación de MAR-01' })
    expect(region).toHaveTextContent('Este producto aún no tiene compras registradas')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(region).queryByRole('table')).not.toBeInTheDocument()
  })

  it('un 404 del servidor se muestra como error', async () => {
    servidor(null, 404)
    renderApp('/comparar', ADMIN)
    await elegir()
    expect(await screen.findByRole('alert')).toHaveTextContent('No existe el producto MAR-01')
  })

  it('un USER que abre /comparar ve "No tiene permiso"', () => {
    servidorFalso({})
    renderApp('/comparar', tokenDePrueba({ roles: ['USER'] }))
    expect(screen.getByRole('heading', { name: 'No tiene permiso' })).toBeInTheDocument()
  })
})
