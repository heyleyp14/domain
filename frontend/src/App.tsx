import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, PrivateRoute } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Productos } from './pages/Productos'
import { Proveedores } from './pages/Proveedores'
import { PuntoVenta } from './pages/PuntoVenta'
import { Facturas } from './pages/Facturas'
import { Compras } from './pages/Compras'
import { Comparar } from './pages/Comparar'
import { ReporteDiario } from './pages/ReporteDiario'
import { Usuarios } from './pages/Usuarios'
import { Perfil } from './pages/Perfil'
import './index.css'

/** Any authenticated user (USER or ADMIN). */
function ProtectedLayout() {
  return <PrivateRoute render={() => <Layout />} />
}

/** ADMIN only (guide, section 5.3). The server is still the real barrier; this keeps the UI honest. */
function SoloAdmin({ children }: { children: ReactNode }) {
  return <PrivateRoute allowedRoles={['ADMIN']} render={() => children} />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vender" element={<PuntoVenta />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/facturas" element={<Facturas />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/compras" element={<SoloAdmin><Compras /></SoloAdmin>} />
        <Route path="/comparar" element={<SoloAdmin><Comparar /></SoloAdmin>} />
        <Route path="/reporte" element={<SoloAdmin><ReporteDiario /></SoloAdmin>} />
        <Route path="/usuarios" element={<SoloAdmin><Usuarios /></SoloAdmin>} />
      </Route>
      {/* Cualquier URL desconocida vuelve a Inicio en vez de dejar la pantalla en blanco. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App