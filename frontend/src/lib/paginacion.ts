export const TAMANO_PAGINA = 20

/** Ajusta una página de la URL al rango que el servidor acaba de devolver. */
export function paginaValida(pagina: number, totalPaginas: number): number {
  if (totalPaginas < 1) return 1
  return Math.min(Math.max(pagina, 1), totalPaginas)
}
