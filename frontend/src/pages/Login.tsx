import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ThemeToggle } from '../components/ThemeToggle'
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
    <main className="login-pantalla">
      <ThemeToggle />
      <a href="#login-form" className="skip-link">Saltar al formulario de inicio de sesión</a>
      <div className="login-contenedor">
        <section className="login-marca-panel" aria-label="Marca">
          <div className="login-marca-contenido">
            <span className="login-marca-etiqueta">Ferretería Ambiente Murano 3D</span>
            <h1 className="login-marca-titulo">Punto de venta</h1>
            <p className="login-marca-subtitulo">Gestiona ventas, inventario y proveedores desde un solo lugar.</p>
          </div>
        </section>
        <section className="login-formulario-panel">
          <div className="login-formulario-encabezado">
            <h2>Iniciar sesión</h2>
            <p>Ingresa con tu usuario para continuar.</p>
          </div>
          <form id="login-form" onSubmit={handleSubmit} aria-label="Inicio de sesión" noValidate>
            {aviso && !error && <div className="aviso" role="status">{aviso}</div>}
            {error && <div className="error" role="alert">{error}</div>}
            <div className="form-group">
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
            <div className="form-group">
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
            <button type="submit" className="btn btn-primary btn-login" disabled={enviando}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}