import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { UserResponse, UsuariosResponse } from '../api/auth'
import { agregarRol, crearUsuario, listarUsuarios } from '../api/usuarios'
import { useAuth } from '../auth/useAuth'
import { CampoTexto } from '../components/Campo'
import { Confirmacion } from '../components/Confirmacion'
import { MensajeError } from '../components/FormFields'
import { Paginador } from '../components/Paginador'
import { Button } from '../components/ui/button'
import { usePaginaUrl } from '../hooks/usePaginaUrl'
import { paginaValida } from '../lib/paginacion'

interface ErroresUsuario {
  username?: string
  password?: string
  repetir?: string
}

/**
 * HU-1 asks for at least 8 characters with letters and numbers. AuthCore only checks 6 (decision D2), so the
 * screen applies the stricter rule before sending.
 */
function validarUsuario(username: string, password: string, repetir: string): ErroresUsuario {
  const e: ErroresUsuario = {}
  const u = username.trim()
  if (!u) e.username = 'El usuario es obligatorio'
  else if (u.length < 3 || u.length > 50) e.username = 'Entre 3 y 50 caracteres'
  else if (/\s/.test(u)) e.username = 'Sin espacios'
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    e.password = 'Mínimo 8 caracteres, con letras y números'
  }
  if (repetir !== password) e.repetir = 'Las contraseñas no coinciden'
  return e
}

function CrearUsuario({ onCreado }: { onCreado: (username: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [errores, setErrores] = useState<ErroresUsuario>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const locales = validarUsuario(username, password, repetir)
    setErrores(locales)
    if (Object.values(locales).some(Boolean)) return
    setEnviando(true)
    try {
      const creado = await crearUsuario(username.trim(), password)
      setUsername('')
      setPassword('')
      setRepetir('')
      onCreado(creado.username)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrores({ username: err.message })
      else setError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" onSubmit={enviar} noValidate
      aria-label="Crear usuario">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Crear usuario</h2>
        <p className="text-xs text-muted-foreground">El usuario nuevo empieza con el rol USER (vendedor).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto id="usuario-username" label="Usuario" value={username} error={errores.username} autoComplete="off"
          onChange={e => { setUsername(e.target.value); setErrores(x => ({ ...x, username: undefined })) }} />
        <CampoTexto id="usuario-password" label="Contraseña" type="password" value={password} error={errores.password}
          autoComplete="new-password" ayuda="Mínimo 8 caracteres, con letras y números"
          onChange={e => { setPassword(e.target.value); setErrores(x => ({ ...x, password: undefined })) }} />
        <CampoTexto id="usuario-repetir" label="Repita la contraseña" type="password" value={repetir} error={errores.repetir}
          autoComplete="new-password"
          onChange={e => { setRepetir(e.target.value); setErrores(x => ({ ...x, repetir: undefined })) }} />
      </div>

      <MensajeError mensaje={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear usuario'}</Button>
      </div>
    </form>
  )
}

/** Users and roles (HU-1, HU-3), ADMIN only: the route is wrapped in <SoloAdmin>. */
export function Usuarios() {
  const { user } = useAuth()
  const { pagina, irAPagina } = usePaginaUrl('pagina')
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; r?: UsuariosResponse; error?: string } | null>(null)
  const [porPromover, setPorPromover] = useState<UserResponse | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const clave = JSON.stringify([pagina, version])

  useEffect(() => {
    let vigente = true
    listarUsuarios(pagina)
      .then(r => vigente && setRespuesta({ clave, r }))
      .catch(e => vigente && setRespuesta({ clave, error: e instanceof Error ? e.message : 'No se pudieron cargar los usuarios' }))
    return () => {
      vigente = false
    }
  }, [clave, pagina])

  const actual = respuesta?.clave === clave ? respuesta : null
  const resultado = actual?.r ?? null
  const usuarios = resultado?.usuarios ?? []

  useEffect(() => {
    if (!resultado || resultado.totalPaginas === 0) return
    const valida = paginaValida(pagina, resultado.totalPaginas)
    if (valida !== pagina) irAPagina(valida, true)
  }, [resultado, pagina, irAPagina])

  const promover = async (u: UserResponse) => {
    setOcupado(true)
    setError(null)
    try {
      await agregarRol(u.id, 'ADMIN')
      setAviso(`${u.username} ahora es administrador. El cambio aplica desde su próximo inicio de sesión.`)
      setPorPromover(null)
      setVersion(v => v + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asignar el rol')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Cuentas y roles del punto de venta.</p>
      </header>

      {aviso && (
        <p role="status" className="rounded-md border border-border bg-[var(--pill-positive-bg)] px-3 py-2 text-sm text-[var(--pill-positive-ink)]">
          {aviso}
        </p>
      )}

      <CrearUsuario onCreado={username => {
        setAviso(`Usuario ${username} creado con el rol USER`)
        setVersion(v => v + 1)
        irAPagina(1, true)
      }} />

      {porPromover && (
        <Confirmacion titulo={`¿Hacer administrador a ${porPromover.username}?`} confirmar="Hacer administrador" ocupado={ocupado}
          variante="default"
          onConfirmar={() => void promover(porPromover)} onCancelar={() => setPorPromover(null)}>
          <p className="text-sm text-muted-foreground">
            Podrá administrar el catálogo, las compras, anular facturas y ver los reportes. AuthCore no permite quitar un rol después.
          </p>
        </Confirmacion>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Usuarios registrados</h2>
        <MensajeError mensaje={error ?? actual?.error ?? null} />
        {!actual && <div className="skeleton h-40 w-full" aria-hidden="true" />}

        {resultado && usuarios.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay usuarios en esta página.</p>
        )}
        {usuarios.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table aria-label="Usuarios registrados" className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Usuario</th>
                  <th className="px-3 py-2 text-left font-medium">Roles</th>
                  <th className="px-3 py-2 text-right font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-medium">{u.username}{u.username === user?.username && ' (usted)'}</td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1.5">
                        {[...u.roles].sort().map(r => (
                          <span key={r} className={r === 'ADMIN'
                            ? 'inline-flex items-center rounded-full bg-[var(--pill-info-bg)] px-2 py-0.5 text-xs font-medium text-[var(--pill-info-ink)]'
                            : 'inline-flex items-center rounded-full bg-[var(--pill-positive-bg)] px-2 py-0.5 text-xs font-medium text-[var(--pill-positive-ink)]'}>
                            {r}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!u.roles.includes('ADMIN') && (
                        <Button type="button" variant="secondary" size="sm"
                          onClick={() => { setAviso(null); setPorPromover(u) }}>
                          Hacer administrador
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resultado && usuarios.length > 0 && (
          <Paginador
            pagina={resultado.pagina}
            totalPaginas={resultado.totalPaginas}
            total={resultado.total}
            etiqueta={resultado.total === 1 ? 'usuario' : 'usuarios'}
            onCambiar={irAPagina}
          />
        )}
      </section>
    </section>
  )
}
