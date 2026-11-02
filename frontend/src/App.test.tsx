import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { busqueda, json, servidorFalso } from './test/servidor'
import { renderApp, tokenDePrueba } from './test/utilidades'

describe('Rutas y sesión', () => {
  it('una URL desconocida vuelve a Inicio en vez de dejar la pantalla en blanco', async () => {
    servidorFalso({ 'GET /api/productos': json(200, busqueda([])) })

    renderApp('/ruta-que-no-existe', tokenDePrueba())

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('conserva la foto de perfil al recargar (montaje doble de StrictMode)', async () => {
    servidorFalso({
      'GET /api/productos': json(200, busqueda([])),
      'GET /api/auth/me': json(200, { id: 7, username: 'vendedor1', roles: ['USER'], imageUrl: 'https://res.cloudinary.com/demo/image.jpg' }),
    })

    renderApp('/', tokenDePrueba(), { strict: true })

    expect(await screen.findByAltText('Foto de perfil')).toHaveAttribute(
      'src', 'https://res.cloudinary.com/demo/image.jpg')
  })
})
