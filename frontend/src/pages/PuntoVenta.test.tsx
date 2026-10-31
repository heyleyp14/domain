import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FacturaResponse } from '../api/domain'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { busqueda, json, producto, servidorFalso } from '../test/servidor'

const USER = tokenDePrueba({ sub: 'vendedor1', roles: ['USER'] })
const martillo = producto('MAR-01', { nombre: 'Martillo de uña', precioFinal: 29750.4, stock: 5 })
const clavos = producto('CLA-01', { nombre: 'Clavos 2"', precioFinal: 1190.5, stock: 100 })
const agotado = producto('PIN-01', { nombre: 'Pintura blanca', stock: 0 })

const factura: FacturaResponse = {
  numero: 'FAC-2026-000042', fecha: '2026-10-30T20:15:00Z', estado: 'EMITIDA', clienteNombre: 'Ana Pérez',
  clienteDireccion: null, clienteTelefono: null, vendedor: 'vendedor1',
  lineas: [{ codigo: 'MAR-01', nombre: 'Martillo de uña', cantidad: 2, precioBase: 25000, aplicaIva: true, subtotal: 50000, iva: 9500, total: 59500 }],
  subtotal: 50000, iva: 9500, total: 59500, anuladaPor: null, anuladaEn: null, motivoAnulacion: null,
}

const buscador = () => screen.getByRole('combobox', { name: 'Agregar producto' })
const carrito = () => within(screen.getByRole('table', { name: 'Carrito' }))

async function agregar(texto: string) {
  await userEvent.clear(buscador())
  await userEvent.type(buscador(), texto)
  await screen.findByRole('option', { name: new RegExp(texto, 'i') })
  await userEvent.keyboard('{Enter}')
}

function servidor(extra = {}) {
  return servidorFalso({
    'GET /api/productos': url => {
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const todos = [martillo, clavos, agotado]
      return json(200, busqueda(todos.filter(p => `${p.codigo} ${p.nombre}`.toLowerCase().includes(q))))()
    },
    ...extra,
  })
}

describe('Punto de venta: autocompletado y carrito (T3.4, RF-11, RF-12, RF-13)', () => {
  it('el autocompletado pide solo productos activos y Enter agrega el producto al carrito', async () => {
    const srv = servidor()
    renderApp('/vender', USER)
    await agregar('mar')

    expect(srv.llamadasA('GET /api/productos')[0].url.searchParams.get('soloActivos')).toBe('true')
    expect(carrito().getByText('MAR-01')).toBeInTheDocument()
    expect(buscador()).toHaveValue('')
    expect(buscador()).toHaveFocus()
  })

  it('con las flechas se elige otra sugerencia', async () => {
    servidor()
    renderApp('/vender', USER)
    await userEvent.type(buscador(), 'la') // matches "Clavos" and "Pintura blanca"
    await screen.findByRole('option', { name: /CLA-01/ })
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: /PIN-01/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowUp}{Enter}')
    expect(carrito().getByText('CLA-01')).toBeInTheDocument()
  })

  it('un producto sin stock aparece pero no se puede agregar', async () => {
    servidor()
    renderApp('/vender', USER)
    await userEvent.type(buscador(), 'pin')
    const opcion = await screen.findByRole('option', { name: /PIN-01/ })
    expect(opcion).toHaveAttribute('aria-disabled', 'true')
    expect(opcion).toHaveTextContent('Sin stock')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText(/El carrito está vacío/)).toBeInTheDocument()
  })

  it('agregar dos veces el mismo producto suma la cantidad en una sola línea', async () => {
    servidor()
    renderApp('/vender', USER)
    await agregar('mar')
    await agregar('mar')
    expect(carrito().getAllByText('MAR-01')).toHaveLength(1)
    expect(carrito().getByLabelText('Cantidad de MAR-01')).toHaveValue(2)
  })

  it('avisa cuando la cantidad supera el stock mostrado', async () => {
    servidor()
    renderApp('/vender', USER)
    await agregar('mar')
    const cantidad = carrito().getByLabelText('Cantidad de MAR-01')
    await userEvent.clear(cantidad)
    await userEvent.type(cantidad, '7')
    expect(cantidad).toHaveAccessibleDescription('Supera el stock disponible (5)')
  })

  it('el total del carrito está rotulado como estimado y se puede quitar una línea', async () => {
    servidor()
    renderApp('/vender', USER)
    await agregar('mar')
    await agregar('cla')
    // 29.750,40 + 1.190,50
    expect(screen.getByText(/Total estimado/)).toHaveTextContent('30.940,90')
    expect(screen.getByText(/lo calcula el servidor/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar CLA-01' }))
    expect(carrito().queryByText('CLA-01')).not.toBeInTheDocument()
  })

  it('con el carrito vacío no se puede confirmar', () => {
    servidor()
    renderApp('/vender', USER)
    expect(screen.getByRole('button', { name: 'Confirmar venta' })).toBeDisabled()
  })
})

describe('Punto de venta: confirmar la venta (T3.4, RF-10, RF-14, RF-15)', () => {
  it('envía la venta, muestra la factura con los valores del servidor y descarga el PDF', async () => {
    const srv = servidor({
      'POST /api/facturas': json(201, factura),
      'GET /api/facturas/FAC-2026-000042/pdf': () =>
        new Response(new Blob(['%PDF-1.4']), { status: 200, headers: { 'Content-Disposition': 'inline; filename="factura-FAC-2026-000042.pdf"' } }),
    })
    const crearUrl = vi.fn(() => 'blob:factura')
    Object.defineProperty(URL, 'createObjectURL', { value: crearUrl, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderApp('/vender', USER)
    await agregar('mar')
    await agregar('mar')
    await userEvent.type(screen.getByLabelText('Nombre del cliente'), '  Ana Pérez ')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Venta registrada: factura FAC-2026-000042')
    expect(srv.llamadasA('POST /api/facturas')[0].cuerpo).toEqual({
      clienteNombre: 'Ana Pérez', clienteDireccion: null, clienteTelefono: null, items: [{ codigo: 'MAR-01', cantidad: 2 }],
    })
    const detalle = screen.getByRole('article', { name: 'Factura FAC-2026-000042' })
    // The cart estimated 2 × 29.750,40 = 59.500,80; the invoice shows the server's official amounts.
    const [subtotal, iva, total] = within(detalle).getAllByRole('definition').map(d => d.textContent)
    expect(subtotal).toMatch(/50\.000,00/)
    expect(iva).toMatch(/9\.500,00/)
    expect(total).toMatch(/59\.500,00/)

    await userEvent.click(within(detalle).getByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1))
    expect(crearUrl).toHaveBeenCalledTimes(1)
    expect((clic.mock.contexts[0] as HTMLAnchorElement).download).toBe('factura-FAC-2026-000042.pdf')

    await userEvent.click(screen.getByRole('button', { name: 'Nueva venta' }))
    expect(screen.getByText(/El carrito está vacío/)).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del cliente')).toHaveValue('')
  })

  it('el 409 de stock lista cada faltante y conserva el carrito', async () => {
    servidor({
      'POST /api/facturas': json(409, {
        status: 409, mensaje: 'Stock insuficiente para completar la venta',
        detalles: ['MAR-01 Martillo de uña (disponible 1, solicitado 2)', 'CLA-01 Clavos 2" (disponible 0, solicitado 1)'],
      }),
    })
    renderApp('/vender', USER)
    await agregar('mar')
    await agregar('mar')
    await agregar('cla')
    await userEvent.type(screen.getByLabelText('Nombre del cliente'), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Stock insuficiente para completar la venta')
    expect(within(alerta).getAllByRole('listitem')).toHaveLength(2)
    expect(alerta).toHaveTextContent('MAR-01 Martillo de uña (disponible 1, solicitado 2)')
    expect(carrito().getByLabelText('Cantidad de MAR-01')).toHaveValue(2)
    expect(carrito().getByText('CLA-01')).toBeInTheDocument()
  })

  it('sin nombre del cliente marca el campo y no envía la venta', async () => {
    const srv = servidor()
    renderApp('/vender', USER)
    await agregar('mar')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    expect(screen.getByLabelText('Nombre del cliente')).toHaveAccessibleDescription('El nombre del cliente es obligatorio')
    expect(srv.llamadasA('POST /api/facturas')).toHaveLength(0)
  })

  it('un 400 del servidor sobre el cliente se marca en su campo', async () => {
    servidor({ 'POST /api/facturas': json(400, { status: 400, mensaje: 'El nombre del cliente debe tener entre 2 y 100 caracteres', detalles: [] }) })
    renderApp('/vender', USER)
    await agregar('mar')
    await userEvent.type(screen.getByLabelText('Nombre del cliente'), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Nombre del cliente')).toHaveAccessibleDescription('El nombre del cliente debe tener entre 2 y 100 caracteres'))
  })

  it('un doble clic en confirmar envía la venta una sola vez', async () => {
    let responder: (r: Response) => void = () => {}
    const srv = servidor({ 'POST /api/facturas': () => new Promise<Response>(r => { responder = r }) })
    renderApp('/vender', USER)
    await agregar('mar')
    await userEvent.type(screen.getByLabelText('Nombre del cliente'), 'Ana')
    await userEvent.dblClick(screen.getByRole('button', { name: 'Confirmar venta' }))

    expect(screen.getByRole('button', { name: 'Registrando venta...' })).toBeDisabled()
    expect(srv.llamadasA('POST /api/facturas')).toHaveLength(1)
    responder(new Response(JSON.stringify(factura), { status: 201 }))
    expect(await screen.findByRole('status')).toHaveTextContent('FAC-2026-000042')
  })
})
