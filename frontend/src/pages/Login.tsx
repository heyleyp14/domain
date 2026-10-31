import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ApiError, authLogin } from '../api/client'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { user, aviso, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const destino = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  if (user) return <Navigate to={destino} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const { token } = await authLogin({ username, password })
      if (!login(token)) {
        setError('El servidor entregó un token inválido o vencido. Intente de nuevo.')
        return
      }
      navigate(destino, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Usuario o contraseña incorrectos')
      else if (err instanceof ApiError) setError(err.message)
      else setError('No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-pantalla">
    <div className="login-container">
      <div className="login-marca">
        <h1>Ferretería Ambiente Murano 3D</h1>
        <p>Punto de venta · Inicie sesión con su usuario</p>
      </div>
      <form onSubmit={handleSubmit}>
        {aviso && !error && <div className="aviso" role="status">{aviso}</div>}
        {error && <div className="error" role="alert">{error}</div>}
        <div>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoFocus
            disabled={enviando}
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={enviando}
          />
        </div>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
    </div>
  )
}
