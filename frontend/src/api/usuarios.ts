import { apiGet, apiPost, apiPostForm, authRegister } from './client'
import type { RegisterResponse, Role, UserResponse, UsuariosResponse } from './auth'

/** AuthCore, ADMIN only: una página de usuarios con sus roles. */
export function listarUsuarios(pagina = 1): Promise<UsuariosResponse> {
  return apiGet<UsuariosResponse>(`/auth/users?pagina=${pagina}`)
}

/** AuthCore: perfil del usuario autenticado, incluida su imagen de Cloudinary. */
export function obtenerMiPerfil(): Promise<UserResponse> {
  return apiGet<UserResponse>('/auth/me')
}

/** AuthCore: sube la imagen del usuario autenticado. Devuelve la URL guardada. */
export function subirMiImagen(archivo: File): Promise<{ imageUrl: string }> {
  const datos = new FormData()
  datos.append('archivo', archivo)
  return apiPostForm<{ imageUrl: string }>('/auth/me/image', datos)
}

/** AuthCore, ADMIN only. It only ADDS the role (204); AuthCore has no way to remove one. */
export function agregarRol(id: number, role: Role): Promise<void> {
  return apiPost<void>(`/auth/users/${id}/roles`, { role })
}

/** Public AuthCore registration: the new user always starts with the USER role. */
export function crearUsuario(username: string, password: string): Promise<RegisterResponse> {
  return authRegister({ username, password })
}
