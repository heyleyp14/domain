import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, servidorFalso } from '../test/servidor'
import { renderApp, respuestaJson, tokenDePrueba } from '../test/utilidades'

const IMAGEN = 'https://res.cloudinary.com/rln6jzqz/image/upload/v1/ferreteria/usuarios/user-vendedor1.png'

const perfil = (imageUrl: string | null = null) => ({
  id: 7,
  username: 'vendedor1',
  roles: ['USER'],
  imageUrl,
})

describe('Mi perfil y foto en Cloudinary', () => {
  it('sube la foto, guarda la URL en la sesión y la muestra', async () => {
    const servidor = servidorFalso({
      'GET /api/auth/me': json(200, perfil()),
      'POST /api/auth/me/image': () => respuestaJson(201, { imageUrl: IMAGEN }),
    })
    renderApp('/perfil', tokenDePrueba())
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()

    const archivo = new File(['contenido'], 'foto.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Subir foto de perfil'), archivo)

    const principal = within(screen.getByRole('main'))
    expect(await principal.findByAltText('Foto de perfil')).toHaveAttribute('src', IMAGEN)
    expect(screen.getByRole('status')).toHaveTextContent('Foto de perfil actualizada')
    expect(servidor.llamadasA('POST /api/auth/me/image')).toHaveLength(1)
  })

  it('rechaza una imagen de más de 2 MB sin llamar a la API', async () => {
    const servidor = servidorFalso({
      'GET /api/auth/me': json(200, perfil()),
    })
    renderApp('/perfil', tokenDePrueba())
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()

    const grande = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'foto.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Subir foto de perfil'), grande)

    expect(await screen.findByRole('alert')).toHaveTextContent('2 MB')
    expect(servidor.llamadasA('POST /api/auth/me/image')).toHaveLength(0)
  })

  it('rechaza un archivo que no es una imagen permitida', async () => {
    const servidor = servidorFalso({
      'GET /api/auth/me': json(200, perfil()),
    })
    renderApp('/perfil', tokenDePrueba())
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()

    const pdf = new File(['%PDF-1.4'], 'factura.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Subir foto de perfil'), { target: { files: [pdf] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Formato no permitido')
    expect(servidor.llamadasA('POST /api/auth/me/image')).toHaveLength(0)
  })
})
