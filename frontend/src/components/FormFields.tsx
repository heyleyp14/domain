import { useId, type ComponentProps, type ReactNode } from 'react'

interface CampoProps {
  label: string
  error?: string
  /** Short help shown under the field when there is no error. */
  ayuda?: ReactNode
}

function Envoltura({ id, label, error, ayuda, children }: CampoProps & { id: string; children: ReactNode }) {
  return (
    <div className={`form-group${error ? ' con-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <div id={`${id}-error`} className="error-campo">{error}</div>
      ) : (
        ayuda && <div id={`${id}-ayuda`} className="ayuda-campo">{ayuda}</div>
      )}
    </div>
  )
}

function descripcion(id: string, error?: string, ayuda?: ReactNode): string | undefined {
  if (error) return `${id}-error`
  return ayuda ? `${id}-ayuda` : undefined
}

/** Text or number input with its label and error. Accepts every native input attribute. */
export function Input({ label, error, ayuda, id, ...props }: CampoProps & ComponentProps<'input'>) {
  const generado = useId()
  const campoId = id ?? generado
  return (
    <Envoltura id={campoId} label={label} error={error} ayuda={ayuda}>
      <input id={campoId} aria-invalid={error ? true : undefined} aria-describedby={descripcion(campoId, error, ayuda)} {...props} />
    </Envoltura>
  )
}

export function Select({
  label, error, ayuda, id, opciones, vacio = 'Seleccione…', ...props
}: CampoProps & ComponentProps<'select'> & { opciones: { value: string; label: string }[]; vacio?: string }) {
  const generado = useId()
  const campoId = id ?? generado
  return (
    <Envoltura id={campoId} label={label} error={error} ayuda={ayuda}>
      <select id={campoId} aria-invalid={error ? true : undefined} aria-describedby={descripcion(campoId, error, ayuda)} {...props}>
        <option value="">{vacio}</option>
        {opciones.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Envoltura>
  )
}

export function Textarea({ label, error, ayuda, id, ...props }: CampoProps & ComponentProps<'textarea'>) {
  const generado = useId()
  const campoId = id ?? generado
  return (
    <Envoltura id={campoId} label={label} error={error} ayuda={ayuda}>
      <textarea id={campoId} aria-invalid={error ? true : undefined} aria-describedby={descripcion(campoId, error, ayuda)} {...props} />
    </Envoltura>
  )
}

/** Error banner for a whole form or screen (server message). */
export function MensajeError({ mensaje, detalles = [] }: { mensaje: string | null; detalles?: string[] }) {
  if (!mensaje) return null
  return (
    <div className="mensaje-error" role="alert">
      <p>{mensaje}</p>
      {detalles.length > 0 && (
        <ul>
          {detalles.map(d => <li key={d}>{d}</li>)}
        </ul>
      )}
    </div>
  )
}
