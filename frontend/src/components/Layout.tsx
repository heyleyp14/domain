import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  IconoCerrar, IconoComparar, IconoCompras, IconoFactura, IconoInicio, IconoMenu, IconoProductos,
  IconoProveedores, IconoReporte, IconoSalir, IconoUsuarios, IconoVender,
} from './Iconos'

interface Destino {
  to: string
  label: string
  icono: ReactNode
  soloAdmin?: boolean
}

// Grouped by the job at the counter, the catalog and the back office (guide 5.3: the last group is ADMIN only).
const GRUPOS: { titulo: string; destinos: Destino[] }[] = [
  {
    titulo: 'Mostrador',
    destinos: [
      { to: '/', label: 'Inicio', icono: <IconoInicio /> },
      { to: '/vender', label: 'Vender', icono: <IconoVender /> },
      { to: '/facturas', label: 'Facturas', icono: <IconoFactura /> },
    ],
  },
  {
    titulo: 'Catálogo',
    destinos: [
      { to: '/productos', label: 'Productos', icono: <IconoProductos /> },
      { to: '/proveedores', label: 'Proveedores', icono: <IconoProveedores /> },
    ],
  },
  {
    titulo: 'Administración',
    destinos: [
      { to: '/compras', label: 'Compras', icono: <IconoCompras />, soloAdmin: true },
      { to: '/comparar', label: 'Comparar precios', icono: <IconoComparar />, soloAdmin: true },
      { to: '/reporte', label: 'Reporte diario', icono: <IconoReporte />, soloAdmin: true },
      { to: '/usuarios', label: 'Usuarios', icono: <IconoUsuarios />, soloAdmin: true },
    ],
  },
]

/** App shell: a labelled sidebar on desktop; on tablets and phones a 52px bar with a full-screen menu. */
export function Layout() {
  const { user, logout, hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)
  const [rutaAbierta, setRutaAbierta] = useState(pathname)

  // Navigating closes the phone menu (state adjusted during render, not in an effect).
  if (rutaAbierta !== pathname) {
    setRutaAbierta(pathname)
    setAbierto(false)
  }

  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto])

  const grupos = GRUPOS.map(g => ({ ...g, destinos: g.destinos.filter(d => !d.soloAdmin || esAdmin) })).filter(g => g.destinos.length)
  const rol = esAdmin ? 'Administrador' : 'Vendedor'

  return (
    <div className="layout">
      <header className="barra-movil">
        <strong>Ferretería Murano 3D</strong>
        <button type="button" className="boton-menu" aria-expanded={abierto} aria-controls="navegacion" aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto(a => !a)}>
          {abierto ? <IconoCerrar /> : <IconoMenu />}
          <span>{abierto ? 'Cerrar' : 'Menú'}</span>
        </button>
      </header>

      <aside id="navegacion" className={`sidebar${abierto ? ' abierta' : ''}`}>
        <NavLink to="/" className="marca">
          <strong>Ferretería Ambiente Murano 3D</strong>
          <span>Punto de venta · Cúcuta</span>
        </NavLink>
        <nav aria-label="Menú principal">
          {grupos.map(g => (
            <div key={g.titulo} className="nav-grupo">
              <span className="nav-grupo-titulo" aria-hidden="true">{g.titulo}</span>
              {g.destinos.map(d => (
                <NavLink key={d.to} to={d.to} end={d.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  {d.icono}
                  {d.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-pie">
          <div className="usuario">
            <strong>{user?.username}</strong>
            <span>{rol}</span>
          </div>
          <button type="button" onClick={logout} className="btn btn-texto btn-logout">
            <IconoSalir className="icono-16" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
