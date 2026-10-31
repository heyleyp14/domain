import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CompraResponse } from '../api/domain'
import { hoyEnBogota } from '../lib/fecha'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { busqueda, json, producto, proveedor, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })
const martillo = producto('MAR-01', { nombre: 'Martillo de uña', stock: 4 })

const compra: CompraResponse = {
  codigo: 'CMP-000005', proveedorId: 2, proveedorNombre: 'Ferremax', fecha: '2026-10-30', registradaPor: 'admin',
  registradaEn: '2026-10-30T20:00:00Z', total: 90000,
  lineas: [{ codigo: 'MAR-01', nombre: 'Martillo de uña', cantidad: 5, precioUnitario: 18000, total: 90000 }],
}

function servidor(extra = {}) {
  return servidorFalso({
    'GET /api/proveedores': json(200, [proveedor(1, 'Distribuidora Andina'), proveedor(2, 'Ferremax')]),
    'GET /api/productos': json(200, busqueda([martillo])),
    'GET /api/compras': json(200, [compra]),
    ...extra,
  })
}

const formulario = () => within(screen.getByRole('form', { name: 'Registrar compra' }))

async function prepararCompra() {
  await formulario().findByRole('option', { name: 'Ferremax' })
  await userEvent.selectOptions(formulario().getByLabelText('Proveedor'), 'Ferremax')
  await userEvent.type(formulario().getByRole('combobox', { name: 'Agregar producto a la compra' }), 'mar')
  await screen.findByRole('option', { name: /MAR-01/ })
  await userEvent.keyboard('{Enter}')
}

describe('Compras: registrar (T3.6, HU-10, RF-18)', () => {
  it('registra la compra, envía los tipos correctos y avisa que el stock aumentó', async () => {
    const srv = servidor({ 'POST /api/compras': json(201, compra) })
    renderApp('/compras', ADMIN)
    await prepararCompra()
    await userEvent.clear(formulario().getByLabelText('Cantidad de MAR-01'))
    await userEvent.type(formulario().getByLabelText('Cantidad de MAR-01'), '5')
    await userEvent.type(formulario().getByLabelText('Precio de compra de MAR-01'), '18000,50')
    await userEvent.click(formulario().getByRole('button', { name: 'Registrar compra' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Compra CMP-000005 registrada: el stock de 1 producto aumentó')
    expect(srv.llamadasA('POST /api/compras')[0].cuerpo).toEqual({
      proveedorId: 2, fecha: hoyEnBogota(), items: [{ codigo: 'MAR-01', cantidad: 5, precioCompra: 18000.5 }],
    })
    expect(screen.getByRole('region', { name: 'Compra CMP-000005' })).toBeInTheDocument()
    await waitFor(() => expect(srv.llamadasA('GET /api/compras')).toHaveLength(2)) // history reloaded
    expect(formulario().queryByRole('table')).not.toBeInTheDocument()
  })

  it('la fecha por defecto es el día de Bogotá, no el de UTC (a las 9:30 p. m.)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T02:30:00Z')) // 30 Oct, 9:30 p.m. in Bogotá
    servidor()
    renderApp('/compras', ADMIN)
    expect(formulario().getByLabelText('Fecha de la compra')).toHaveValue('2026-10-30')
  })

  it('una fecha futura, cantidades fuera de rango y precios vacíos se marcan sin enviar', async () => {
    const srv = servidor()
    renderApp('/compras', ADMIN)
    await prepararCompra()
    const fecha = formulario().getByLabelText('Fecha de la compra')
    await userEvent.clear(fecha)
    await userEvent.type(fecha, '2099-01-01')
    await userEvent.clear(formulario().getByLabelText('Cantidad de MAR-01'))
    await userEvent.type(formulario().getByLabelText('Cantidad de MAR-01'), '0')
    await userEvent.click(formulario().getByRole('button', { name: 'Registrar compra' }))

    expect(fecha).toHaveAccessibleDescription('La fecha no puede ser futura')
    expect(formulario().getByLabelText('Cantidad de MAR-01')).toHaveAccessibleDescription('Entre 1 y 100000 unidades')
    expect(formulario().getByLabelText('Precio de compra de MAR-01')).toHaveAccessibleDescription('Escriba el precio')
    expect(srv.llamadasA('POST /api/compras')).toHaveLength(0)
  })

  it('sin proveedor ni productos no envía nada', async () => {
    const srv = servidor()
    renderApp('/compras', ADMIN)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar compra' }))
    expect(formulario().getByLabelText('Proveedor')).toHaveAccessibleDescription('Seleccione el proveedor')
    expect(formulario().getByRole('alert')).toHaveTextContent('Agregue al menos un producto')
    expect(srv.llamadasA('POST /api/compras')).toHaveLength(0)
  })

  it('un producto que ya está en la compra no se repite', async () => {
    servidor()
    renderApp('/compras', ADMIN)
    await prepararCompra()
    await userEvent.type(formulario().getByRole('combobox', { name: 'Agregar producto a la compra' }), 'mar')
    await screen.findByRole('option', { name: /MAR-01/ })
    await userEvent.keyboard('{Enter}')
    expect(formulario().getAllByLabelText('Cantidad de MAR-01')).toHaveLength(1)
    expect(formulario().getByRole('status')).toHaveTextContent('MAR-01 ya está en la compra')
  })

  it('un error del servidor que no es de un campo se muestra en el formulario', async () => {
    servidor({ 'POST /api/compras': json(409, { status: 409, mensaje: 'El producto MAR-01 está desactivado', detalles: [] }) })
    renderApp('/compras', ADMIN)
    await prepararCompra()
    await userEvent.type(formulario().getByLabelText('Precio de compra de MAR-01'), '18000')
    await userEvent.click(formulario().getByRole('button', { name: 'Registrar compra' }))
    expect(await formulario().findByRole('alert')).toHaveTextContent('El producto MAR-01 está desactivado')
    expect(formulario().getByLabelText('Cantidad de MAR-01')).toBeInTheDocument() // the lines are kept
  })
})

describe('Compras: historial (T3.6)', () => {
  it('lista las compras y muestra el detalle de una', async () => {
    servidor()
    renderApp('/compras', ADMIN)
    const historial = await screen.findByRole('table', { name: 'Historial de compras' })
    const fila = within(historial).getByText('CMP-000005').closest('tr')!
    expect(within(fila).getByText('Ferremax')).toBeInTheDocument()
    await userEvent.click(within(fila).getByRole('button', { name: 'Ver' }))
    const detalle = screen.getByRole('region', { name: 'Compra CMP-000005' })
    expect(within(detalle).getByText('Martillo de uña')).toBeInTheDocument()
  })

  it('envía los filtros de proveedor, fechas y producto al servidor', async () => {
    const srv = servidor()
    renderApp('/compras', ADMIN)
    const filtros = within(screen.getByRole('form', { name: 'Filtros de compras' }))
    await filtros.findByRole('option', { name: 'Ferremax' })
    await userEvent.selectOptions(filtros.getByLabelText('Filtrar por proveedor'), 'Ferremax')
    await userEvent.type(filtros.getByLabelText('Desde'), '2026-10-01')
    await userEvent.type(filtros.getByLabelText('Hasta'), '2026-10-31')
    await userEvent.type(filtros.getByLabelText('Código de producto'), 'mar-01')
    await userEvent.click(filtros.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(srv.llamadasA('GET /api/compras')).toHaveLength(2))
    const params = srv.llamadasA('GET /api/compras')[1].url.searchParams
    expect(Object.fromEntries(params)).toEqual({ proveedorId: '2', desde: '2026-10-01', hasta: '2026-10-31', producto: 'MAR-01' })
  })

  it('busca una compra por código y muestra el 404 del servidor', async () => {
    servidor({ 'GET /api/compras/CMP-999999': json(404, { status: 404, mensaje: 'No existe la compra CMP-999999', detalles: [] }) })
    renderApp('/compras', ADMIN)
    const form = within(screen.getByRole('form', { name: 'Buscar compra por código' }))
    await userEvent.type(form.getByLabelText('Código de compra'), 'cmp-999999')
    await userEvent.click(form.getByRole('button', { name: 'Ver compra' }))
    expect(await screen.findByText('No existe la compra CMP-999999')).toBeInTheDocument()
  })

  it('un USER que abre /compras ve "No tiene permiso" y no se consulta nada', () => {
    const srv = servidorFalso({})
    renderApp('/compras', tokenDePrueba({ roles: ['USER'] }))
    expect(screen.getByRole('heading', { name: 'No tiene permiso' })).toBeInTheDocument()
    expect(srv.llamadas).toHaveLength(0)
  })
})
