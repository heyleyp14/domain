import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from './ui/card'

interface Props {
  icono: LucideIcon
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
}

/** Empty state shared by screens: icon, title, explanation and optional actions. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, acciones }: Props) {
  return (
    <Card className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Icono className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{titulo}</p>
      {descripcion && <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>}
      {acciones && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{acciones}</div>}
    </Card>
  )
}
