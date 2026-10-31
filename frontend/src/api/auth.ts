// Tipos para la API de AuthCore
// Basados en authcore/src/main/java/com/pamplona/authcore/infrastructure/adapters/in/rest/dto/*

export interface RegisterRequest {
  username: string
  password: string
}

export interface RegisterResponse {
  id: number
  username: string
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
}