import type { ReactNode } from 'react'

interface ConfirmacionProps {
  titulo: string
  children: ReactNode
  confirmar: string
  onConfirmar: () => void
  onCancelar: () => void
  ocupado?: boolean
}

/** Inline confirmation panel (no window.confirm: it blocks the page and cannot be styled or tested). */
export function Confirmacion({ titulo, children, confirmar, onConfirmar, onCancelar, ocupado }: ConfirmacionProps) {
  return (
    <div className="card confirmacion" role="alertdialog" aria-labelledby="confirmacion-titulo">
      <h3 id="confirmacion-titulo">{titulo}</h3>
      <div>{children}</div>
      <div className="acciones">
        <button type="button" className="btn btn-danger" onClick={onConfirmar} disabled={ocupado}>
          {confirmar}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
