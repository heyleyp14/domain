import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, PrivateRoute } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Productos } from './pages/Productos'
import { Proveedores } from './pages/Proveedores'
import { PuntoVenta } from './pages/PuntoVenta'
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
        <Route path="/facturas" element={<div>Facturas - En desarrollo</div>} />
        <Route path="/compras" element={<SoloAdmin><div>Compras - En desarrollo</div></SoloAdmin>} />
        <Route path="/comparar" element={<SoloAdmin><div>Comparar precios - En desarrollo</div></SoloAdmin>} />
        <Route path="/reporte" element={<SoloAdmin><div>Reporte diario - En desarrollo</div></SoloAdmin>} />
        <Route path="/usuarios" element={<SoloAdmin><div>Usuarios - En desarrollo</div></SoloAdmin>} />
      </Route>
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