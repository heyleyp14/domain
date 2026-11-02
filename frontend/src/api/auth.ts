// Tipos para la API de AuthCore
// Basados en authcore/src/main/java/com/pamplona/authcore/infrastructure/adapters/in/rest/dto/*

export interface RegisterRequest {
  username: string
  password: string
  imageUrl?: string
}

export interface RegisterResponse {
  id: number
  username: string
  imageUrl?: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export type Role = 'ADMIN' | 'USER'

export interface AssignRoleRequest {
  role: Role
}

export interface UserResponse {
  id: number
  username: string
  roles: Role[]
  /** URL de Cloudinary; null o ausente cuando el usuario no ha subido imagen. */
  imageUrl?: string | null
}

export interface UsuariosResponse {
  total: number
  pagina: number
  tamano: number
  totalPaginas: number
  usuarios: UserResponse[]
}