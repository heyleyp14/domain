import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { buscarProductos } from '../api/catalogo'
import type { ProductoResponse } from '../api/domain'
import { useDebounce } from '../hooks/useDebounce'
import { formatearPesos } from '../lib/formato'

const MINIMO_CARACTERES = 2
const MAXIMO_SUGERENCIAS = 8

interface Props {
  label: string
  onElegir: (producto: ProductoResponse) => void
  /** Only active products (default). Sales and purchases never offer inactive ones. */
  soloActivos?: boolean
  /** Products without stock are shown but cannot be chosen (point of sale). */
  exigirStock?: boolean
  autoFocus?: boolean
}

/**
 * Product autocomplete (RF-11): type 2+ characters, move with the arrows, Enter chooses, Escape closes.
 * After choosing, the box is cleared and keeps the focus, so the next product can be typed right away.
 */
export function BuscadorProductos({ label, onElegir, soloActivos = true, exigirStock = false, autoFocus }: Props) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const q = useDebounce(texto.trim(), 300)
  const [respuesta, setRespuesta] = useState<{ q: string; productos?: ProductoResponse[]; error?: string } | null>(null)

  const puedeBuscar = q.length >= MINIMO_CARACTERES

  useEffect(() => {
    if (!puedeBuscar) return
    let vigente = true
    buscarProductos({ q, soloActivos })
      .then(r => vigente && setRespuesta({ q, productos: r.productos.slice(0, MAXIMO_SUGERENCIAS) }))
      .catch(e => vigente && setRespuesta({ q, error: e instanceof Error ? e.message : 'No se pudo buscar' }))
    return () => {
      vigente = false
    }
  }, [q, puedeBuscar, soloActivos])

  const actual = puedeBuscar && respuesta?.q === q ? respuesta : null
  const sugerencias = actual?.productos ?? []
  const elegible = (p: ProductoResponse) => !exigirStock || p.stock > 0
  const mostrar = abierto && texto.trim().length >= MINIMO_CARACTERES

  const elegir = (p: ProductoResponse) => {
    if (!elegible(p)) return
    onElegir(p)
    setTexto('')
    setAbierto(false)
    setActivo(0)
    entrada.current?.focus()
  }

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && sugerencias.length) {
      e.preventDefault()
      setAbierto(true)
      setActivo(i => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp' && sugerencias.length) {
      e.preventDefault()
      setActivo(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit the surrounding form from the search box
      const elegido = sugerencias[activo]
      if (mostrar && elegido) elegir(elegido)
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  const listaId = `${id}-lista`
  return (
    <div className="buscador">
      <label htmlFor={id}>{label}</label>
      <input
        ref={entrada}
        id={id}
        type="search"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={mostrar && sugerencias[activo] ? `${id}-op-${activo}` : undefined}
        value={texto}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Código o nombre (mínimo 2 caracteres)"
        onChange={e => {
          setTexto(e.target.value)
          setAbierto(true)
          setActivo(0)
        }}
        onKeyDown={alTeclear}
      />
      {mostrar && (
        <ul id={listaId} role="listbox" aria-label={`Resultados para ${texto.trim()}`} className="sugerencias">
          {!actual && <li className="loading">Buscando...</li>}
          {actual?.error && <li className="error-campo">{actual.error}</li>}
          {actual && !actual.error && sugerencias.length === 0 && <li className="sin-resultados">No se encontraron productos</li>}
          {sugerencias.map((p, i) => (
            <li
              key={p.codigo}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={i === activo}
              aria-disabled={!elegible(p)}
              className={i === activo ? 'activa' : undefined}
              onMouseDown={e => e.preventDefault()} // keep focus in the input
              onClick={() => elegir(p)}
            >
              <strong>{p.codigo}</strong> {p.nombre} · {formatearPesos(p.precioFinal)} ·{' '}
              {p.stock > 0 ? `${p.stock} disponibles` : 'Sin stock'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
