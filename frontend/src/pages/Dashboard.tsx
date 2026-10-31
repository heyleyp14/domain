import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Dashboard() {
  const { user, hasRole } = useAuth()
  const isAdmin = hasRole('ADMIN')

  return (
    <div className="dashboard">
      <h1>Bienvenido, {user?.username}</h1>
      <p className="rol-badge">Rol: {user?.roles.join(', ')}</p>

      <section className="quick-actions">
        <h2>Acciones rápidas</h2>
        <div className="action-grid">
          <Link to="/vender" className="action-card">
            <h3>🛒 Vender</h3>
            <p>Registrar una venta y generar factura</p>
          </Link>
          <Link to="/productos" className="action-card">
            <h3>📦 Productos</h3>
            <p>Buscar y consultar catálogo</p>
          </Link>
          <Link to="/proveedores" className="action-card">
            <h3>🚚 Proveedores</h3>
            <p>Ver proveedores y sus productos</p>
          </Link>
          <Link to="/facturas" className="action-card">
            <h3>📄 Facturas</h3>
            <p>Consultar y descargar facturas</p>
          </Link>
          {isAdmin && (
            <>
              <Link to="/compras" className="action-card">
                <h3>📥 Compras</h3>
                <p>Registrar compras a proveedores</p>
              </Link>
              <Link to="/comparar" className="action-card">
                <h3>📊 Comparar precios</h3>
                <p>Comparar precios entre proveedores</p>
              </Link>
              <Link to="/reporte" className="action-card">
                <h3>📈 Reporte diario</h3>
                <p>Ver reporte de ventas del día</p>
              </Link>
              <Link to="/usuarios" className="action-card">
                <h3>👥 Usuarios</h3>
                <p>Administrar usuarios y roles</p>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}