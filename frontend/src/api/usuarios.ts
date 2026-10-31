import { apiGet, apiPost, authRegister } from './client'
import type { RegisterResponse, Role, UserResponse } from './auth'

/** AuthCore, ADMIN only: every user with its roles. */
export function listarUsuarios(): Promise<UserResponse[]> {
  return apiGet<UserResponse[]>('/auth/users')
}

/** AuthCore, ADMIN only. It only ADDS the role (204); AuthCore has no way to remove one. */
export function agregarRol(id: number, role: Role): Promise<void> {
  return apiPost<void>(`/auth/users/${id}/roles`, { role })
}

/** Public AuthCore registration: the new user always starts with the USER role. */
export function crearUsuario(username: string, password: string): Promise<RegisterResponse> {
  return authRegister({ username, password })
}
