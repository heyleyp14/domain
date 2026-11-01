import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { FacturaResponse } from '../api/domain'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { json, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })
const USER = tokenDePrueba({ roles: ['USER'] })

const emitida: FacturaResponse = {
  numero: 'FAC-2026-000007', fecha: '2026-10-30T20:15:00Z', estado: 'EMITIDA', clienteNombre: 'Ana Pérez',
  clienteDireccion: 'Calle 10 # 5-20', clienteTelefono: null, vendedor: 'vendedor1',
  lineas: [{ codigo: 'MAR-01', nombre: 'Martillo', cantidad: 2, precioBase: 25000, aplicaIva: true, subtotal: 50000, iva: 9500, total: 59500 }],
  subtotal: 50000, iva: 9500, total: 59500, anuladaPor: null, anuladaEn: null, motivoAnulacion: null,
}
const anulada: FacturaResponse = {
  ...emitida, estado: 'ANULADA', anuladaPor: 'admin', anuladaEn: '2026-10-30T21:00:00Z', motivoAnulacion: 'Error en el cobro',
}

async function buscar(numero: string) {
  await userEvent.type(screen.getByLabelText('Número de factura'), numero)
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
}

describe('Facturas: consulta (T3.5, HU-9)', () => {
  it('busca por número (en minúsculas también) y muestra la factura con su PDF', async () => {
    const srv = servidorFalso({ 'GET /api/facturas/FAC-2026-000007': json(200, emitida) })
    renderApp('/facturas', USER)
    await buscar('fac-2026-000007')

    const detalle = await screen.findByRole('article', { name: 'Factura FAC-2026-000007' })
    expect(within(detalle).getByText(/Ana Pérez/)).toBeInTheDocument()
    expect(within(detalle).getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument()
    expect(srv.llamadasA('GET /api/facturas/FAC-2026-000007')).toHaveLength(1)
  })

  it('un número mal escrito se marca sin consultar al servidor', async () => {
    const srv = servidorFalso({})
    renderApp('/facturas', USER)
    await buscar('123')
    expect(screen.getByLabelText('Número de factura')).toHaveAccessibleDescription(/FAC-2026-000001/)
    expect(srv.llamadas).toHaveLength(0)
  })

  it('una factura inexistente muestra el mensaje del servidor', async () => {
    servidorFalso({ 'GET /api/facturas/FAC-2026-999999': json(404, { status: 404, mensaje: 'No existe la factura FAC-2026-999999', detalles: [] }) })
    renderApp('/facturas', USER)
    await buscar('FAC-2026-999999')
    expect(await screen.findByRole('alert')).toHaveTextContent('No existe la factura FAC-2026-999999')
  })

  it('abre la factura directamente desde la dirección ?numero=', async () => {
    servidorFalso({ 'GET /api/facturas/FAC-2026-000007': json(200, emitida) })
    renderApp('/facturas?numero=FAC-2026-000007', USER)
    expect(await screen.findByRole('article', { name: 'Factura FAC-2026-000007' })).toBeInTheDocument()
  })

  it('sin número muestra el estado inicial y no consulta al servidor', () => {
    const srv = servidorFalso({})
    renderApp('/facturas', USER)
    expect(screen.getByText(/Busca una factura para ver su detalle/)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(srv.llamadas).toHaveLength(0)
  })

  it('limpiar la consulta borra el número y el detalle', async () => {
    servidorFalso({ 'GET /api/facturas/FAC-2026-000007': json(200, emitida) })
    renderApp('/facturas?numero=FAC-2026-000007', USER)
    await screen.findByRole('article', { name: 'Factura FAC-2026-000007' })
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(screen.getByLabelText('Número de factura')).toHaveValue('')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText(/Busca una factura para ver su detalle/)).toBeInTheDocument()
  })

  it('un USER no ve el botón de anular', async () => {
    servidorFalso({ 'GET /api/facturas/FAC-2026-000007': json(200, emitida) })
    renderApp('/facturas?numero=FAC-2026-000007', USER)
    await screen.findByRole('article', { name: 'Factura FAC-2026-000007' })
    expect(screen.queryByRole('button', { name: 'Anular factura' })).not.toBeInTheDocument()
  })

  it('una factura anulada muestra quién, cuándo y el motivo, y no se puede anular otra vez', async () => {
    servidorFalso({ 'GET /api/facturas/FAC-2026-000007': json(200, anulada) })
    renderApp('/facturas?numero=FAC-2026-000007', ADMIN)
    const detalle = await screen.findByRole('article', { name: 'Factura FAC-2026-000007' })
    expect(within(detalle).getByText('ANULADA')).toBeInTheDocument()
    expect(detalle).toHaveTextContent('Anulada por admin')
    expect(detalle).toHaveTextContent('Motivo: Error en el cobro')
    expect(screen.queryByRole('button', { name: 'Anular factura' })).not.toBeInTheDocument()
  })
})

describe('Facturas: anulación (T3.5, solo ADMIN)', () => {
  it('anula con motivo, envía el motivo y muestra la factura ANULADA', async () => {
    const srv = servidorFalso({
      'GET /api/facturas/FAC-2026-000007': json(200, emitida),
      'POST /api/facturas/FAC-2026-000007/anulacion': json(200, anulada),
    })
    renderApp('/facturas?numero=FAC-2026-000007', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Anular factura' }))

    const form = screen.getByRole('form', { name: 'Anular FAC-2026-000007' })
    expect(form).toHaveTextContent('el stock de cada producto vuelve al inventario')
    await userEvent.type(within(form).getByLabelText('Motivo de la anulación'), '  Error en el cobro ')
    await userEvent.click(within(form).getByRole('button', { name: 'Anular factura' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Factura FAC-2026-000007 anulada')
    expect(srv.llamadasA('POST /api/facturas/FAC-2026-000007/anulacion')[0].cuerpo).toEqual({ motivo: 'Error en el cobro' })
    expect(screen.getByText('ANULADA')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Anular FAC-2026-000007' })).not.toBeInTheDocument()
  })

  it('un motivo de menos de 5 caracteres se marca y no se envía', async () => {
    const srv = servidorFalso({ 'GET /api/facturas/FAC-2026-000007': json(200, emitida) })
    renderApp('/facturas?numero=FAC-2026-000007', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Anular factura' }))
    const form = screen.getByRole('form', { name: 'Anular FAC-2026-000007' })
    await userEvent.type(within(form).getByLabelText('Motivo de la anulación'), 'abc')
    await userEvent.click(within(form).getByRole('button', { name: 'Anular factura' }))

    expect(within(form).getByLabelText('Motivo de la anulación')).toHaveAccessibleDescription('Escriba el motivo, entre 5 y 300 caracteres')
    expect(srv.llamadasA('POST /api/facturas/FAC-2026-000007/anulacion')).toHaveLength(0)
  })

  it('si otra persona ya la anuló, muestra el 409 del servidor', async () => {
    servidorFalso({
      'GET /api/facturas/FAC-2026-000007': json(200, emitida),
      'POST /api/facturas/FAC-2026-000007/anulacion': json(409, { status: 409, mensaje: 'La factura FAC-2026-000007 ya está anulada', detalles: [] }),
    })
    renderApp('/facturas?numero=FAC-2026-000007', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Anular factura' }))
    const form = screen.getByRole('form', { name: 'Anular FAC-2026-000007' })
    await userEvent.type(within(form).getByLabelText('Motivo de la anulación'), 'Error en el cobro')
    await userEvent.click(within(form).getByRole('button', { name: 'Anular factura' }))

    await waitFor(() => expect(within(form).getByRole('alert')).toHaveTextContent('ya está anulada'))
  })
})
