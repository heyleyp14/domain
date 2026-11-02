import { Button } from './ui/button'

interface Props {
  pagina: number
  totalPaginas: number
  total: number
  onCambiar: (pagina: number) => void
  etiqueta?: string
}

/** Pie de tabla con el total y los controles de página. */
export function Paginador({ pagina, totalPaginas, total, onCambiar, etiqueta = 'resultados' }: Props) {
  if (total === 0) return null
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {total} {etiqueta}
      </span>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
            Anterior
          </Button>
          <span aria-current="page" className="tabular-nums text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </nav>
  )
}
