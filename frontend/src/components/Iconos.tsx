// One outline icon set, 16px on a 24 grid with a 1.5 stroke, drawn for the screens this app has.
// Decorative next to a visible label: aria-hidden, the label names the action.

type Props = { className?: string }

function Icono({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const IconoInicio = (p: Props) => <Icono {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" /></Icono>
export const IconoVender = (p: Props) => <Icono {...p}><path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 7H6" /><circle cx="9" cy="19.5" r="1.25" /><circle cx="17" cy="19.5" r="1.25" /></Icono>
export const IconoFactura = (p: Props) => <Icono {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6M9 16h3" /></Icono>
export const IconoProductos = (p: Props) => <Icono {...p}><path d="M12 3 4 7v10l8 4 8-4V7Z" /><path d="M4 7l8 4 8-4M12 11v10" /></Icono>
export const IconoProveedores = (p: Props) => <Icono {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.75" /><circle cx="17" cy="18" r="1.75" /></Icono>
export const IconoCompras = (p: Props) => <Icono {...p}><path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" /><path d="M12 3v11M8 10l4 4 4-4" /></Icono>
export const IconoComparar = (p: Props) => <Icono {...p}><path d="M12 4v16M5 20h14" /><path d="M5 8h14M7 8l-3 6a3 3 0 0 0 6 0Zm10 0-3 6a3 3 0 0 0 6 0Z" /></Icono>
export const IconoReporte = (p: Props) => <Icono {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></Icono>
export const IconoUsuarios = (p: Props) => <Icono {...p}><circle cx="9" cy="8" r="3.25" /><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><path d="M16 5.5a3 3 0 0 1 0 5.6M18 14.6c1.6.6 2.7 2.2 3 4.9" /></Icono>
export const IconoSalir = (p: Props) => <Icono {...p}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></Icono>
export const IconoMenu = (p: Props) => <Icono {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icono>
export const IconoCerrar = (p: Props) => <Icono {...p}><path d="M6 6l12 12M18 6 6 18" /></Icono>
