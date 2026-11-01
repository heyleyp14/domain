import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { MensajeError } from '../components/FormFields'

const CLAVE_FOTO = 'perfil-foto'
const CLAVE_NOMBRE = 'perfil-nombre'

export function Perfil() {
  const { user } = useAuth()
  const [nombre, setNombre] = useState(user?.username ?? '')
  const [foto, setFoto] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fotoGuardada = localStorage.getItem(CLAVE_FOTO)
    if (fotoGuardada) setFoto(fotoGuardada)
    const nombreGuardado = localStorage.getItem(CLAVE_NOMBRE)
    if (nombreGuardado) setNombre(nombreGuardado)
  }, [])

  const onElegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setFoto(dataUrl)
      try {
        localStorage.setItem(CLAVE_FOTO, dataUrl)
        setMensaje('Foto actualizada')
        setError(null)
      } catch {
        setError('No se pudo guardar la foto (almacenamiento lleno)')
      }
    }
    reader.onerror = () => {
      setError('No se pudo leer la imagen')
    }
    reader.readAsDataURL(file)
  }

  const onGuardar = (e: React.FormEvent) => {
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
    <section className="flex flex-col gap-4 max-w-2xl -mt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Información de tu cuenta y preferencias</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {foto ? (
              <img src={foto} alt="Foto de perfil" className="h-20 w-20 rounded-full object-cover border border-border" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border border-border" aria-hidden="true">
                {inicial}
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-pointer"
              aria-label="Cambiar foto de perfil"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onElegirFoto} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Foto de perfil</p>
            <p className="text-xs text-muted-foreground">Se usará próximamente en la app. Formatos: JPG, PNG.</p>
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