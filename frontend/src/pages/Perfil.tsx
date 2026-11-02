import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { subirMiImagen } from '../api/usuarios'
import { useAuth } from '../auth/useAuth'
import { MensajeError } from '../components/FormFields'

const CLAVE_NOMBRE = 'perfil-nombre'
const MAX_BYTES = 2 * 1024 * 1024
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp']

export function Perfil() {
  const { user, actualizarImagen } = useAuth()
  const [nombre, setNombre] = useState(() => localStorage.getItem(CLAVE_NOMBRE) ?? user?.username ?? '')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onElegirFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setError(null)
    setMensaje(null)
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError('Formato no permitido; use JPG, PNG o WebP')
      return
    }
    if (archivo.size > MAX_BYTES) {
      setError('La imagen no debe superar 2 MB')
      return
    }
    setSubiendo(true)
    try {
      const { imageUrl } = await subirMiImagen(archivo)
      actualizarImagen(imageUrl)
      setMensaje('Foto de perfil actualizada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  const onGuardar = (e: FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    setError(null)
    try {
      localStorage.setItem(CLAVE_NOMBRE, nombre.trim())
      setMensaje('Perfil guardado')
    } catch {
      setError('No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const inicial = (nombre || user?.username || 'U').charAt(0).toUpperCase()

  return (
    <section className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Información de tu cuenta y preferencias</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Foto de perfil" className="h-20 w-20 rounded-full object-cover border border-border" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border border-border" aria-hidden="true">
                {inicial}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
              aria-label={subiendo ? 'Subiendo foto de perfil' : 'Cambiar foto de perfil'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label="Subir foto de perfil"
              onChange={onElegirFoto}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Foto de perfil</p>
            <p className="text-xs text-muted-foreground">
              {subiendo ? 'Subiendo a Cloudinary...' : 'JPG, PNG o WebP. Máximo 2 MB.'}
            </p>
          </div>
        </div>

        <form onSubmit={onGuardar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="perfil-nombre" className="text-sm font-medium">Nombre de usuario</label>
            <input
              id="perfil-nombre"
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              aria-describedby={error ? 'perfil-error' : undefined}
              className="min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Roles</label>
            <div className="flex gap-2 flex-wrap">
              {(user?.roles ?? []).map(r => (
                <span key={r} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{r}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ID de usuario</label>
            <p className="text-sm text-muted-foreground tabular-nums">{user?.id ?? '—'}</p>
          </div>

          <div id="perfil-error">
            <MensajeError mensaje={error} />
          </div>
          {mensaje && <p role="status" aria-live="polite" className="text-sm text-emerald-600">{mensaje}</p>}

          <div className="flex justify-end">
          <button type="submit" disabled={guardando} className="min-h-[44px] px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 font-medium text-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
