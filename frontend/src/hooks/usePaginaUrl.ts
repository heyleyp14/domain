import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type CambiosUrl = Record<string, string | number | boolean | null | undefined>

/**
 * Lee y escribe la página (y otros filtros) en la URL, conservando el resto de parámetros.
 * `reemplazar` evita llenar el historial cuando se sincroniza texto debounced.
 */
export function usePaginaUrl(clave = 'pagina') {
  const [params, setParams] = useSearchParams()
  const crudo = Number(params.get(clave) ?? '1')
  const pagina = Number.isInteger(crudo) && crudo > 0 ? crudo : 1

  const actualizar = useCallback((cambios: CambiosUrl, reemplazar = false) => {
    setParams(prev => {
      const siguiente = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(cambios)) {
        if (v === null || v === undefined || v === '' || v === false) siguiente.delete(k)
        else siguiente.set(k, String(v))
      }
      return siguiente
    }, { replace: reemplazar })
  }, [setParams])

  const irAPagina = useCallback((n: number, reemplazar = false) => {
    actualizar({ [clave]: n <= 1 ? null : n }, reemplazar)
  }, [actualizar, clave])

  return { params, pagina, actualizar, irAPagina }
}
