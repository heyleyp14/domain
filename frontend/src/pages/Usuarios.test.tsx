import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { UserResponse } from '../api/auth'
import { renderApp, tokenDePrueba } from '../test/utilidades'
import { json, servidorFalso } from '../test/servidor'

const ADMIN = tokenDePrueba({ sub: 'admin', roles: ['USER', 'ADMIN'] })
const usuarios: UserResponse[] = [
  { id: 1, username: 'admin', roles: ['ADMIN', 'USER'] },
  { id: 2, username: 'vendedor1', roles: ['USER'] },
]

function servidor(extra = {}) {
  let lista = usuarios
  const srv = servidorFalso({
    'GET /api/auth/users': () => json(200, lista)(),
    'POST /api/auth/users/2/roles': () => {
      lista = lista.map(u => (u.id === 2 ? { ...u, roles: ['USER', 'ADMIN'] } : u))
      return new Response(null, { status: 204 })
    },
    ...extra,
  })
  return srv
}

const crear = () => within(screen.getByRole('form', { name: 'Crear usuario' }))

async function llenar(usuario: string, clave: string, repetir = clave) {
  await userEvent.type(crear().getByLabelText('Usuario'), usuario)
  await userEvent.type(crear().getByLabelText('Contraseña'), clave)
  await userEvent.type(crear().getByLabelText('Repita la contraseña'), repetir)
  await userEvent.click(crear().getByRole('button', { name: 'Crear usuario' }))
}

describe('Usuarios (T3.9, HU-1, HU-3)', () => {
  it('lista los usuarios con sus roles y marca al usuario actual', async () => {
    servidor()
    renderApp('/usuarios', ADMIN)
    const tabla = await screen.findByRole('table', { name: 'Usuarios registrados' })
    const admin = within(tabla).getByText(/^admin/).closest('tr')!
    expect(admin).toHaveTextContent('admin (usted)')
    expect(within(admin).getByText('ADMIN')).toBeInTheDocument()
    expect(within(admin).queryByRole('button', { name: 'Hacer administrador' })).not.toBeInTheDocument()
    const vendedor = within(tabla).getByText('vendedor1').closest('tr')!
    expect(within(vendedor).queryByText('ADMIN')).not.toBeInTheDocument()
  })

  it('crea un usuario por el registro público de AuthCore, sin enviar el token', async () => {
    const srv = servidor({ 'POST /api/auth/register': json(201, { id: 3, username: 'cajero2' }) })
    renderApp('/usuarios', ADMIN)
    await screen.findByRole('table', { name: 'Usuarios registrados' })
    await llenar(' cajero2 ', 'Clave2026x')

    expect(await screen.findByRole('status')).toHaveTextContent('Usuario cajero2 creado con el rol USER')
    const registro = srv.llamadasA('POST /api/auth/register')[0]
    expect(registro.cuerpo).toEqual({ username: 'cajero2', password: 'Clave2026x' })
    const cabeceras = (globalThis.fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock.calls
      .find(([url]) => String(url).endsWith('/auth/register'))![1].headers as Headers
    expect(cabeceras.get('Authorization')).toBeNull()
    await waitFor(() => expect(srv.llamadasA('GET /api/auth/users')).toHaveLength(2))
    expect(crear().getByLabelText('Usuario')).toHaveValue('')
  })

  it('exige 8 caracteres con letras y números aunque AuthCore acepte 6 (D2), y que las claves coincidan', async () => {
    const srv = servidor()
    renderApp('/usuarios', ADMIN)
    await llenar('cajero2', 'abcdef', 'otra')
    expect(crear().getByLabelText('Contraseña')).toHaveAccessibleDescription('Mínimo 8 caracteres, con letras y números')
    expect(crear().getByLabelText('Repita la contraseña')).toHaveAccessibleDescription('Las contraseñas no coinciden')

    await userEvent.clear(crear().getByLabelText('Contraseña'))
    await userEvent.type(crear().getByLabelText('Contraseña'), 'solamenteletras')
    await userEvent.click(crear().getByRole('button', { name: 'Crear usuario' }))
    expect(crear().getByLabelText('Contraseña')).toHaveAccessibleDescription('Mínimo 8 caracteres, con letras y números')
    expect(srv.llamadasA('POST /api/auth/register')).toHaveLength(0)
  })

  it('el 409 de usuario repetido aparece junto al campo usuario', async () => {
    servidor({ 'POST /api/auth/register': json(409, { error: 'Ya existe un usuario con username: vendedor1' }) })
    renderApp('/usuarios', ADMIN)
    await llenar('vendedor1', 'Clave2026x')
    await waitFor(() =>
      expect(crear().getByLabelText('Usuario')).toHaveAccessibleDescription('Ya existe un usuario con username: vendedor1'))
  })

  it('hacer administrador pide confirmación, envía el rol y actualiza la lista', async () => {
    const srv = servidor()
    renderApp('/usuarios', ADMIN)
    const tabla = await screen.findByRole('table', { name: 'Usuarios registrados' })
    await userEvent.click(within(within(tabla).getByText('vendedor1').closest('tr')!).getByRole('button', { name: 'Hacer administrador' }))

    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('AuthCore no permite quitar un rol después')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Hacer administrador' }))

    expect(await screen.findByRole('status')).toHaveTextContent('vendedor1 ahora es administrador')
    expect(srv.llamadasA('POST /api/auth/users/2/roles')[0].cuerpo).toEqual({ role: 'ADMIN' })
    await waitFor(() =>
      expect(within(screen.getByText('vendedor1').closest('tr')!).getByText('ADMIN')).toBeInTheDocument())
  })

  it('un USER que abre /usuarios ve "No tiene permiso" y no se consulta nada', () => {
    const srv = servidorFalso({})
    renderApp('/usuarios', tokenDePrueba({ roles: ['USER'] }))
    expect(screen.getByRole('heading', { name: 'No tiene permiso' })).toBeInTheDocument()
    expect(srv.llamadas).toHaveLength(0)
  })
})
