import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { useSidebarStore } from '../stores/useSidebarStore'
import {
  IconoInicio, IconoVender, IconoFactura, IconoProductos, IconoProveedores,
  IconoCompras, IconoComparar, IconoReporte, IconoUsuarios, IconoCerrar, IconoMenu, IconoSalir,
} from './Iconos'

interface Destino { to: string; label: string; icono: ReactNode; soloAdmin?: boolean }
interface Grupo { titulo: string; destinos: Destino[] }

const GRUPOS: Grupo[] = [
  {
    titulo: 'Mostrador',
    destinos: [
      { to: '/', label: 'Inicio', icono: <IconoInicio className="w-4 h-4" /> },
      { to: '/vender', label: 'Vender', icono: <IconoVender className="w-4 h-4" /> },
      { to: '/facturas', label: 'Facturas', icono: <IconoFactura className="w-4 h-4" /> },
    ],
  },
  {
    titulo: 'Catálogo',
    destinos: [
      { to: '/productos', label: 'Productos', icono: <IconoProductos className="w-4 h-4" /> },
      { to: '/proveedores', label: 'Proveedores', icono: <IconoProveedores className="w-4 h-4" /> },
    ],
  },
  {
    titulo: 'Administración',
    destinos: [
      { to: '/compras', label: 'Compras', icono: <IconoCompras className="w-4 h-4" />, soloAdmin: true },
      { to: '/comparar', label: 'Comparar precios', icono: <IconoComparar className="w-4 h-4" />, soloAdmin: true },
      { to: '/reporte', label: 'Reporte diario', icono: <IconoReporte className="w-4 h-4" />, soloAdmin: true },
      { to: '/usuarios', label: 'Usuarios', icono: <IconoUsuarios className="w-4 h-4" />, soloAdmin: true },
    ],
  },
]

export function Layout() {
  const { user, logout, hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const { pathname } = useLocation()
  const { colapsado, abierto, toggleColapsado, setAbierto } = useSidebarStore()
  const [rutaAbierta, setRutaAbierta] = useState(pathname)
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)

  useEffect(() => {
    setFotoPerfil(localStorage.getItem('perfil-foto'))
  }, [abierto])

  const iniciales = (user?.username ?? 'U').slice(0, 2).toUpperCase()

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

  const efectivamenteColapsado = colapsado && !abierto

  return (
    <div className={`layout ${colapsado ? 'colapsado' : ''}`}>
      {abierto && <div className="overlay" onClick={() => setAbierto(false)} aria-hidden="true" />}
      <aside id="navegacion" className={`sidebar ${abierto ? 'abierto' : ''}`}>
        {abierto && (
          <div className="sidebar-cerrar-movil">
            <button type="button" className="boton-cerrar-menu" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
              <IconoCerrar />
              <span>Cerrar</span>
            </button>
          </div>
        )}
        <a href="/" className="marca" onClick={e => e.preventDefault()}>
          {!efectivamenteColapsado && (
            <>
              <img src="/logo-hammer-wrench-1.jpg" alt="Murano 3D" className="marca-logo" width={32} height={32} />
              <div className="marca-texto">
                <strong>Ferretería Ambiente Murano 3D</strong>
                <span>Punto de venta · Cúcuta 🇨🇴</span>
              </div>
            </>
          )}
          <button type="button" className="btn-colapsar" aria-label={efectivamenteColapsado ? 'Expandir menú' : 'Contraer menú'} onClick={toggleColapsado}>
            {efectivamenteColapsado ? '»' : '«'}
          </button>
        </a>
        <nav className="sidebar-nav" aria-label="Menú principal">
          {grupos.map(g => (
            <div key={g.titulo} className="nav-grupo">
              {!efectivamenteColapsado && <span className="nav-grupo-titulo" aria-hidden="true">{g.titulo}</span>}
              {g.destinos.map(d => (
                <NavLink key={d.to} to={d.to} end={d.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  {d.icono}
                  {!efectivamenteColapsado && <span>{d.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-pie">
          <ThemeToggle className="toggle-tema toggle-tema-sidebar" conEtiqueta={!efectivamenteColapsado} />
          {!efectivamenteColapsado && (
            <NavLink to="/perfil" className="usuario usuario-link">
              <div className="avatar-sidebar">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="Foto de perfil" className="avatar-img" />
                ) : (
                  <span className="avatar-iniciales">{iniciales}</span>
                )}
              </div>
              <div className="usuario-texto">
                <strong>{user?.username ?? 'admin'}</strong>
              </div>
            </NavLink>
          )}
          <button type="button" className="nav-link btn-salir" onClick={logout}>
            <IconoSalir className="w-4 h-4" />
            {!efectivamenteColapsado && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
      <div className="barra-movil">
        <a href="/" className="marca-movil" onClick={e => e.preventDefault()}>
          <strong>Murano 3D</strong>
        </a>
        <div className="barra-movil-acciones">
          <ThemeToggle className="toggle-tema-barra" />
          <button type="button" className="boton-menu" aria-expanded={abierto} aria-controls="navegacion" aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setAbierto(!abierto)}>
            {abierto ? <IconoCerrar /> : <IconoMenu />}
          </button>
        </div>
      </div>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}