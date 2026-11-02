import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { json, pagina, producto, proveedor, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })
const USER = tokenDePrueba({ roles: ['USER'] })

describe('Proveedores (T3.3, HU-8)', () => {
  it('lista los proveedores y muestra los productos que suministra cada uno', async () => {
    servidorFalso({
      'GET /api/proveedores': json(200, pagina('proveedores', [proveedor(1, 'Distribuidora Andina', { correo: 'ventas@andina.co' })])),
      'GET /api/proveedores/1': json(200, {
        proveedor: proveedor(1, 'Distribuidora Andina'),
        totalProductos: 1,
        pagina: 1,
        tamano: 20,
        totalPaginas: 1,
        productos: [producto('MAR-01', { stock: 2, stockBajo: true })],
      }),
    })
    renderApp('/proveedores', USER)

    const fila = (await screen.findByText('Distribuidora Andina')).closest('tr')!
    expect(within(fila).getByText('ventas@andina.co')).toBeInTheDocument()
    await userEvent.click(within(fila).getByRole('button', { name: 'Ver productos' }))

    const detalle = await screen.findByRole('region', { name: 'Detalle de Distribuidora Andina' })
    expect(within(detalle).getByText('Productos que suministra (1)')).toBeInTheDocument()
    expect(within(detalle).getByText('MAR-01')).toBeInTheDocument()
    expect(within(detalle).getByText('Stock bajo')).toBeInTheDocument()
  })

  it('busca en el servidor por nombre', async () => {
    const srv = servidorFalso({ 'GET /api/proveedores': json(200, pagina('proveedores', [])) })
    renderApp('/proveedores', USER)
    await userEvent.type(screen.getByLabelText('Buscar proveedor por nombre'), 'andina')
    await waitFor(() => expect(srv.llamadasA('GET /api/proveedores').at(-1)!.url.searchParams.get('q')).toBe('andina'))
    expect(await screen.findByText('No se encontraron proveedores')).toBeInTheDocument()
  })

  it('un USER no puede crear ni editar proveedores', async () => {
    servidorFalso({ 'GET /api/proveedores': json(200, pagina('proveedores', [proveedor(1, 'Distribuidora Andina')])) })
    renderApp('/proveedores', USER)
    await screen.findByText('Distribuidora Andina')
    expect(screen.queryByRole('button', { name: 'Nuevo proveedor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('sin teléfono ni correo marca los dos campos y no envía nada', async () => {
    const srv = servidorFalso({ 'GET /api/proveedores': json(200, pagina('proveedores', [])) })
    renderApp('/proveedores', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo proveedor' }))
    const form = screen.getByRole('form', { name: 'Nuevo proveedor' })
    await userEvent.type(within(form).getByLabelText('Nombre'), 'Ferremax')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    expect(within(form).getByLabelText('Teléfono')).toHaveAccessibleDescription('Indique teléfono o correo')
    expect(within(form).getByLabelText('Correo')).toHaveAccessibleDescription('Indique teléfono o correo')
    expect(srv.llamadasA('POST /api/proveedores')).toHaveLength(0)
  })

  it('crea un proveedor, enviando null en los datos opcionales vacíos', async () => {
    const srv = servidorFalso({
      'GET /api/proveedores': json(200, pagina('proveedores', [])),
      'POST /api/proveedores': json(201, proveedor(5, 'Ferremax')),
    })
    renderApp('/proveedores', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo proveedor' }))
    const form = screen.getByRole('form', { name: 'Nuevo proveedor' })
    await userEvent.type(within(form).getByLabelText('Nombre'), '  Ferremax ')
    await userEvent.type(within(form).getByLabelText('Teléfono'), '300 123 4567')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Proveedor «Ferremax» guardado')
    expect(srv.llamadasA('POST /api/proveedores')[0].cuerpo).toEqual({
      nombre: 'Ferremax', telefono: '300 123 4567', correo: null, direccion: null,
    })
  })

  it('el 409 de nombre repetido aparece junto al nombre', async () => {
    servidorFalso({
      'GET /api/proveedores': json(200, pagina('proveedores', [])),
      'POST /api/proveedores': json(409, { status: 409, mensaje: 'Ya existe un proveedor con el nombre «Ferremax»', detalles: [] }),
    })
    renderApp('/proveedores', ADMIN)
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo proveedor' }))
    const form = screen.getByRole('form', { name: 'Nuevo proveedor' })
    await userEvent.type(within(form).getByLabelText('Nombre'), 'Ferremax')
    await userEvent.type(within(form).getByLabelText('Correo'), 'a@b.co')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(within(form).getByLabelText('Nombre')).toHaveAccessibleDescription('Ya existe un proveedor con el nombre «Ferremax»'))
  })
})
