import { describe, expect, it } from 'vitest'
import { estaVencido, leerJwt } from './jwt'
import { tokenDePrueba } from '../test/utilidades'

describe('leerJwt', () => {
  it('lee usuario, id, roles y vencimiento de un token como los de AuthCore', () => {
    const sesion = leerJwt(tokenDePrueba({ sub: 'admin', uid: 1, roles: ['USER', 'ADMIN'], expiraEnSegundos: 60 }))
    expect(sesion).toMatchObject({ username: 'admin', id: 1, roles: ['USER', 'ADMIN'] })
    expect(sesion!.expiraEn).toBeGreaterThan(Date.now())
  })

  it('decodifica base64url (con - y _) y tildes en UTF-8, que atob solo no soporta', () => {
    // This name produces "-" and "_" in the base64url payload and contains multi-byte characters.
    const token = tokenDePrueba({ sub: 'José Peña ~~~>>>???' })
    expect(token.split('.')[1]).toMatch(/[-_]/)
    expect(leerJwt(token)?.username).toBe('José Peña ~~~>>>???')
  })

  it('devuelve null si el token está mal formado o le falta sub o exp', () => {
    expect(leerJwt('no-es-un-token')).toBeNull()
    expect(leerJwt('a.b.c')).toBeNull()
    const sinExp = `x.${btoa(JSON.stringify({ sub: 'u' }))}.f`
    expect(leerJwt(sinExp)).toBeNull()
  })

  it('acepta un solo rol como texto e ignora roles desconocidos', () => {
    const payload = btoa(JSON.stringify({ sub: 'u', exp: 9999999999, roles: 'ADMIN' }))
    expect(leerJwt(`x.${payload}.f`)?.roles).toEqual(['ADMIN'])
    const raro = btoa(JSON.stringify({ sub: 'u', exp: 9999999999, roles: ['USER', 'ROOT'] }))
    expect(leerJwt(`x.${raro}.f`)?.roles).toEqual(['USER'])
  })
})

describe('estaVencido', () => {
  it('vence exactamente al llegar a exp', () => {
    const sesion = leerJwt(tokenDePrueba({ expiraEnSegundos: 10 }))!
    expect(estaVencido(sesion, sesion.expiraEn - 1)).toBe(false)
    expect(estaVencido(sesion, sesion.expiraEn)).toBe(true)
  })
})
