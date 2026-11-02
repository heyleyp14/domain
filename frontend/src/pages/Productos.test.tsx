import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { busqueda, json, pagina, producto, proveedor, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })
const USER = tokenDePrueba({ roles: ['USER'] })
const buscador = () => screen.getByLabelText('Buscar por código, nombre o proveedor')

describe('Productos: búsqueda (T3.3, RF-07, RF-06)', () => {
  it('consulta una sola vez con el texto debounced y envía la página', async () => {
    const srv = servidorFalso({ 'GET /api/productos': json(200, busqueda([producto('MAR-01')])) })
    renderApp('/productos', USER)

    await userEvent.type(buscador(), 'martillo')
    expect(await screen.findByText('MAR-01')).toBeInTheDocument()

    await waitFor(() => {
      const conTexto = srv.llamadasA('GET /api/productos').filter(c => c.url.searchParams.get('q') === 'martillo')
      expect(conTexto).toHaveLength(1)
      expect(conTexto[0].url.searchParams.get('pagina')).toBe('1')
    })
  })

  it('muestra precio base, IVA, precio final del servidor y el distintivo de stock bajo', async () => {
    servidorFalso({
      'GET /api/productos': json(200, busqueda([
        producto('MAR-01', { precioBase: 25000, precioFinal: 29750, stock: 3, stockBajo: true }),
        producto('CLA-01', { aplicaIva: false, precioFinal: 1000, precioBase: 1000, stock: 40 }),
      ])),
    })
    renderApp('/productos', USER)

    const fila = (await screen.findByText('MAR-01')).closest('tr')!
    expect(within(fila).getByText(/29\.750,00/)).toBeInTheDocument()
    expect(within(fila).getByText('19 %')).toBeInTheDocument()
    expect(within(fila).getByText('Stock bajo')).toBeInTheDocument()
    const otra = screen.getByText('CLA-01').closest('tr')!
    expect(within(otra).queryByText('Stock bajo')).not.toBeInTheDocument()
    expect(within(otra).getByText('No')).toBeInTheDocument()
  })

  it('sin coincidencias muestra "No se encontraron productos"', async () => {
    servidorFalso({ 'GET /api/productos': json(200, busqueda([])) })
    renderApp('/productos', USER)
    await userEvent.type(buscador(), 'zzz')
    expect(await screen.findByText('No se encontraron productos')).toBeInTheDocument()
  })

  it('carga el catálogo al entrar y el filtro de stock bajo consulta al servidor', async () => {
    const srv = servidorFalso({ 'GET /api/productos': json(200, busqueda([producto('MAR-01', { stockBajo: true })])) })
    renderApp('/productos', USER)

    expect(await screen.findByText('MAR-01')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Solo stock bajo'))

    await waitFor(() => expect(srv.llamadasA('GET /api/productos').at(-1)!.url.searchParams.get('bajoStock')).toBe('true'))
  })

  it('sin resultados permite limpiar la búsqueda y volver al catálogo', async () => {
    servidorFalso({
      'GET /api/productos': url => json(200, busqueda(url.searchParams.get('q') === 'zzz' ? [] : [producto('MAR-01')]))(),
    })
    renderApp('/productos', USER)
    await userEvent.type(buscador(), 'zzz')

    expect(await screen.findByText('No se encontraron productos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda y filtros' }))

    await waitFor(() => expect(buscador()).toHaveValue(''))
    expect(await screen.findByText('MAR-01')).toBeInTheDocument()
  })

  it('los filtros consultan aunque no haya texto, y se envían al servidor', async () => {
    const srv = servidorFalso({ 'GET /api/productos': json(200, busqueda([producto('MAR-01', { stockBajo: true })])) })
    renderApp('/productos', USER)
    await userEvent.click(screen.getByLabelText('Solo stock bajo'))
    expect(await screen.findByText('MAR-01')).toBeInTheDocument()
    await waitFor(() => expect(srv.llamadasA('GET /api/productos').at(-1)!.url.searchParams.get('bajoStock')).toBe('true'))
  })

  it('pagina desde la URL: Siguiente pide la página 2 al servidor', async () => {
    const pagina1 = Array.from({ length: 20 }, (_, i) => producto(`P-${String(i).padStart(3, '0')}`))
    const pagina2 = [producto('P-020')]
    const srv = servidorFalso({
      'GET /api/productos': url => {
        const p = url.searchParams.get('pagina') ?? '1'
        const cuerpo = p === '2'
          ? { total: 21, pagina: 2, tamano: 20, totalPaginas: 2, mensaje: null, productos: pagina2 }
          : { total: 21, pagina: 1, tamano: 20, totalPaginas: 2, mensaje: null, productos: pagina1 }
        return json(200, cuerpo)()
      },
    })
    renderApp('/productos', USER)

    expect(await screen.findByText('P-000')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(await screen.findByText('P-020')).toBeInTheDocument()
    expect(srv.llamadasA('GET /api/productos').at(-1)!.url.searchParams.get('pagina')).toBe('2')
  })

  it('un USER no ve las acciones de administración', async () => {
    servidorFalso({ 'GET /api/productos': json(200, busqueda([producto('MAR-01')])) })
    renderApp('/productos', USER)
    await screen.findByText('MAR-01')
    expect(screen.queryByRole('button', { name: 'Nuevo producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()
  })
})

describe('Productos: crear, editar y desactivar (T3.3, RF-04, RF-08, RF-09)', () => {
  const proveedores = json(200, pagina('proveedores', [proveedor(1, 'Distribuidora Andina'), proveedor(2, 'Ferremax')]))

  async function abrirNuevo() {
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }))
    const form = screen.getByRole('form', { name: 'Nuevo producto' })
    await within(form).findByRole('option', { name: 'Ferremax' })
    return form
  }

  async function llenar(form: HTMLElement) {
    await userEvent.type(within(form).getByLabelText('Código'), 'mar-02')
    await userEvent.type(within(form).getByLabelText('Nombre'), 'Martillo de bola')
    await userEvent.type(within(form).getByLabelText('Precio base (sin IVA)'), '31000.50')
    await userEvent.clear(within(form).getByLabelText('Stock inicial'))
    await userEvent.type(within(form).getByLabelText('Stock inicial'), '8')
    await userEvent.selectOptions(within(form).getByLabelText('Proveedor'), 'Ferremax')
  }

  it('crea un producto: normaliza el código y envía los datos con el tipo correcto', async () => {
    const srv = servidorFalso({
      'GET /api/proveedores': proveedores,
      'POST /api/productos': json(201, producto('MAR-02')),
      'GET /api/productos': json(200, busqueda([])),
    })
    renderApp('/productos', ADMIN)
    const form = await abrirNuevo()
    await llenar(form)
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Producto MAR-02 guardado')
    expect(srv.llamadasA('POST /api/productos')[0].cuerpo).toEqual({
      codigo: 'MAR-02', nombre: 'Martillo de bola', precioBase: 31000.5, aplicaIva: true, stockInicial: 8, proveedorId: 2,
    })
  })

  it('con datos inválidos marca cada campo y no envía nada al servidor', async () => {
    const srv = servidorFalso({ 'GET /api/proveedores': proveedores, 'GET /api/productos': json(200, busqueda([])) })
    renderApp('/productos', ADMIN)
    const form = await abrirNuevo()
    await userEvent.type(within(form).getByLabelText('Código'), 'x')
    await userEvent.type(within(form).getByLabelText('Precio base (sin IVA)'), '-5')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    expect(within(form).getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(within(form).getByLabelText('Nombre')).toHaveAccessibleDescription('El nombre es obligatorio')
    expect(within(form).getByLabelText('Precio base (sin IVA)')).toHaveAttribute('aria-invalid', 'true')
    expect(within(form).getByLabelText('Proveedor')).toHaveAccessibleDescription('Seleccione el proveedor')
    expect(srv.llamadasA('POST /api/productos')).toHaveLength(0)
  })

  it('un 400 del servidor con varios campos faltantes marca cada uno', async () => {
    servidorFalso({
      'GET /api/proveedores': proveedores,
      'GET /api/productos': json(200, busqueda([])),
      'POST /api/productos': json(400, { status: 400, mensaje: 'Faltan campos obligatorios: nombre, precio', detalles: [] }),
    })
    renderApp('/productos', ADMIN)
    const form = await abrirNuevo()
    await llenar(form)
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(within(form).getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true'))
    expect(within(form).getByLabelText('Precio base (sin IVA)')).toHaveAttribute('aria-invalid', 'true')
    expect(within(form).getByLabelText('Código')).not.toHaveAttribute('aria-invalid')
  })

  it('el 409 de código repetido aparece junto al campo código', async () => {
    servidorFalso({
      'GET /api/proveedores': proveedores,
      'GET /api/productos': json(200, busqueda([])),
      'POST /api/productos': json(409, { status: 409, mensaje: 'Ya existe un producto con el código «MAR-02»', detalles: [] }),
    })
    renderApp('/productos', ADMIN)
    const form = await abrirNuevo()
    await llenar(form)
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(within(form).getByLabelText('Código')).toHaveAccessibleDescription('Ya existe un producto con el código «MAR-02»'))
  })

  it('al editar no se puede cambiar el stock ni el código', async () => {
    const srv = servidorFalso({
      'GET /api/productos': json(200, busqueda([producto('MAR-01', { stock: 12 })])),
      'GET /api/proveedores': proveedores,
      'PUT /api/productos/MAR-01': json(200, producto('MAR-01', { nombre: 'Martillo nuevo' })),
    })
    renderApp('/productos', ADMIN)
    await userEvent.type(buscador(), 'ma')
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))

    const form = screen.getByRole('form', { name: 'Editar producto' })
    expect(within(form).queryByLabelText('Stock inicial')).not.toBeInTheDocument()
    expect(within(form).queryByLabelText('Código')).not.toBeInTheDocument()
    expect(within(form).getByText(/Editar no cambia el inventario/)).toBeInTheDocument()

    await within(form).findByRole('option', { name: 'Ferremax' })
    await userEvent.clear(within(form).getByLabelText('Nombre'))
    await userEvent.type(within(form).getByLabelText('Nombre'), 'Martillo nuevo')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))

    await screen.findByText('Producto MAR-01 guardado')
    expect(srv.llamadasA('PUT /api/productos/MAR-01')[0].cuerpo).not.toHaveProperty('stockInicial')
  })

  it('desactivar pide confirmación: cancelar no hace nada y confirmar llama al servidor', async () => {
    const srv = servidorFalso({
      'GET /api/productos': json(200, busqueda([producto('MAR-01')])),
      'POST /api/productos/MAR-01/desactivar': json(200, producto('MAR-01', { activo: false })),
    })
    renderApp('/productos', ADMIN)
    await userEvent.type(buscador(), 'ma')
    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))

    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Su historial de facturas y compras se conserva')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(srv.llamadasA('POST /api/productos/MAR-01/desactivar')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }))
    expect(await screen.findByText('Producto MAR-01 desactivado')).toBeInTheDocument()
    expect(srv.llamadasA('POST /api/productos/MAR-01/desactivar')).toHaveLength(1)
  })
})
