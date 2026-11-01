import type { ReactNode } from 'react'
import { Button } from './ui/button'

interface ConfirmacionProps {
  titulo: string
  children: ReactNode
  confirmar: string
  onConfirmar: () => void
  onCancelar: () => void
  ocupado?: boolean
  /** `destructive` for actions that remove or disable, `default` for promotions. */
  variante?: 'destructive' | 'default'
}

/** Inline confirmation panel (no window.confirm: it blocks the page and cannot be styled or tested). */
export function Confirmacion({ titulo, children, confirmar, onConfirmar, onCancelar, ocupado, variante = 'destructive' }: ConfirmacionProps) {
  return (
    <div role="alertdialog" aria-labelledby="confirmacion-titulo"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 id="confirmacion-titulo" className="text-base font-semibold">{titulo}</h3>
      <div>{children}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={variante} onClick={onConfirmar} disabled={ocupado}>
          {confirmar}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
