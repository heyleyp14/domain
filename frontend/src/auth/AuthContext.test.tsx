import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { apiGet } from '../api/client'
import { renderApp, respuestaJson, tokenDePrueba } from '../test/utilidades'

const menu = () => within(screen.getByRole('navigation', { name: 'Menú principal' }))

describe('Menú y rutas por rol (T3.2, guía 5.3)', () => {
  it('el menú de un USER no incluye Compras, Comparar precios, Reporte diario ni Usuarios', () => {
    renderApp('/', tokenDePrueba({ roles: ['USER'] }))
    expect(menu().getByRole('link', { name: 'Vender' })).toBeInTheDocument()
    for (const opcion of ['Compras', 'Comparar precios', 'Reporte diario', 'Usuarios']) {
      expect(menu().queryByRole('link', { name: opcion })).not.toBeInTheDocument()
    }
  })

  it('el menú de un ADMIN incluye las opciones de administración', () => {
    renderApp('/', tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] }))
    for (const opcion of ['Compras', 'Comparar precios', 'Reporte diario', 'Usuarios']) {
      expect(menu().getByRole('link', { name: opcion })).toBeInTheDocument()
    }
  })

  it('un USER que abre /reporte ve "No tiene permiso"', () => {
    renderApp('/reporte', tokenDePrueba({ roles: ['USER'] }))
    expect(screen.getByRole('heading', { name: 'No tiene permiso' })).toBeInTheDocument()
    expect(screen.queryByText(/Reporte diario - En desarrollo/)).not.toBeInTheDocument()
  })

  it('sin sesión, una ruta protegida lleva al login', () => {
    renderApp('/vender')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})

describe('Sesión (T3.2, RF-01, RF-03, HU-6)', () => {
  it('al recargar la página, la sesión se restaura desde sessionStorage', () => {
    renderApp('/', tokenDePrueba({ sub: 'cajero2' }))
    expect(screen.getByRole('heading', { name: 'Bienvenido, cajero2' })).toBeInTheDocument()
  })

  it('un token vencido no entra: muestra el login con "Su sesión venció" y borra el token', () => {
    renderApp('/vender', tokenDePrueba({ expiraEnSegundos: -5 }))
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Su sesión venció')
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('inicia sesión, vuelve a la ruta pedida y guarda el token solo en sessionStorage', async () => {
    const token = tokenDePrueba({ sub: 'vendedor1' })
    const fetchFalso = vi.fn().mockResolvedValue(respuestaJson(200, { token }))
    vi.stubGlobal('fetch', fetchFalso)
    renderApp('/facturas')

    await userEvent.type(screen.getByLabelText('Usuario'), 'vendedor1')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave12345')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/Facturas - En desarrollo/)).toBeInTheDocument()
    expect(fetchFalso).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
    expect(sessionStorage.getItem('token')).toBe(token)
    expect(localStorage.length).toBe(0)
  })

  it('con credenciales inválidas muestra "Usuario o contraseña incorrectos" y no guarda nada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(401, { error: 'Usuario o contrasena incorrectos' })))
    renderApp('/login')

    await userEvent.type(screen.getByLabelText('Usuario'), 'x')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('cada petición lleva el token, y un 401 del servidor cierra la sesión con "Su sesión venció"', async () => {
    const token = tokenDePrueba()
    const fetchFalso = vi.fn().mockResolvedValue(respuestaJson(401, { status: 401, mensaje: 'No autenticado' }))
    vi.stubGlobal('fetch', fetchFalso)
    renderApp('/', token)

    await act(async () => {
      await expect(apiGet('/productos')).rejects.toMatchObject({ status: 401 })
    })

    const cabeceras = fetchFalso.mock.calls[0][1].headers as Headers
    expect(cabeceras.get('Authorization')).toBe(`Bearer ${token}`)
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Su sesión venció')
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('al llegar la hora de vencimiento, la sesión se cierra sola', () => {
    vi.useFakeTimers()
    renderApp('/', tokenDePrueba({ expiraEnSegundos: 120 }))
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(121_000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Su sesión venció')
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('cerrar sesión borra el token y vuelve al login, sin aviso de vencimiento', async () => {
    renderApp('/', tokenDePrueba())
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })
})
