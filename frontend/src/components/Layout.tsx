import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Layout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = hasRole('ADMIN')

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <NavLink to="/" className="brand">
            Ferretería Ambiente Murano 3D
          </NavLink>
        </div>
        <nav className="header-nav" aria-label="Menú principal">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Inicio
          </NavLink>
          <NavLink to="/vender" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Vender
          </NavLink>
          <NavLink to="/productos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Productos
          </NavLink>
          <NavLink to="/proveedores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Proveedores
          </NavLink>
          <NavLink to="/facturas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Facturas
          </NavLink>
          {isAdmin && (
            <React.Fragment>
              <NavLink to="/compras" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Compras
              </NavLink>
              <NavLink to="/comparar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Comparar precios
              </NavLink>
              <NavLink to="/reporte" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Reporte diario
              </NavLink>
              <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Usuarios
              </NavLink>
            </React.Fragment>
          )}
        </nav>
        <div className="header-right">
          <span className="user-info">
            {user?.username} ({user?.roles.join(', ')})
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}