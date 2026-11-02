import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { busqueda, json, servidorFalso } from './test/servidor'
import { renderApp, tokenDePrueba } from './test/utilidades'

describe('Rutas', () => {
  it('una URL desconocida vuelve a Inicio en vez de dejar la pantalla en blanco', async () => {
    servidorFalso({ 'GET /api/productos': json(200, busqueda([])) })

    renderApp('/ruta-que-no-existe', tokenDePrueba())

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })
})
