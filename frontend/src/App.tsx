import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw new Error('Usuario o contraseña incorrectos')
      const data = await res.json()
      sessionStorage.setItem('token', data.token)
      window.location.href = '/'
    } catch {
      setError('Usuario o contraseña incorrectos')
    }
  }

  return (
    <div className="login-container">
      <h1>Ferretería Ambiente Murano 3D</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <header>
        <h1>Ferretería Ambiente Murano 3D</h1>
        <button onClick={() => { sessionStorage.removeItem('token'); window.location.href = '/login'; }}>
          Cerrar sesión
        </button>
      </header>
      <main>{children}</main>
    </div>
  )
}

function Dashboard() {
  return <div>Dashboard - Bienvenido</div>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = sessionStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App