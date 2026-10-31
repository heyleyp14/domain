import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { UserResponse } from '../api/auth'
import { agregarRol, crearUsuario, listarUsuarios } from '../api/usuarios'
import { useAuth } from '../auth/useAuth'
import { Confirmacion } from '../components/Confirmacion'
import { Input, MensajeError } from '../components/FormFields'

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
    <form className="card formulario" onSubmit={enviar} noValidate aria-label="Crear usuario">
      <h2>Crear usuario</h2>
      <p className="ayuda-campo">El usuario nuevo empieza con el rol USER (vendedor).</p>
      <Input label="Usuario" value={username} error={errores.username} autoComplete="off"
        onChange={e => { setUsername(e.target.value); setErrores(x => ({ ...x, username: undefined })) }} />
      <Input label="Contraseña" type="password" value={password} error={errores.password} autoComplete="new-password"
        ayuda="Mínimo 8 caracteres, con letras y números"
        onChange={e => { setPassword(e.target.value); setErrores(x => ({ ...x, password: undefined })) }} />
      <Input label="Repita la contraseña" type="password" value={repetir} error={errores.repetir} autoComplete="new-password"
        onChange={e => { setRepetir(e.target.value); setErrores(x => ({ ...x, repetir: undefined })) }} />
      <MensajeError mensaje={error} />
      <div className="acciones">
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Creando...' : 'Crear usuario'}</button>
      </div>
    </form>
  )
}

/** Users and roles (HU-1, HU-3), ADMIN only: the route is wrapped in <SoloAdmin>. */
export function Usuarios() {
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ version: number; usuarios?: UserResponse[]; error?: string } | null>(null)
  const [porPromover, setPorPromover] = useState<UserResponse | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    listarUsuarios()
      .then(usuarios => vigente && setRespuesta({ version, usuarios }))
      .catch(e => vigente && setRespuesta({ version, error: e instanceof Error ? e.message : 'No se pudieron cargar los usuarios' }))
    return () => {
      vigente = false
    }
  }, [version])

  const actual = respuesta?.version === version ? respuesta : null

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
    <section className="pagina">
      <h1>Usuarios</h1>
      {aviso && <p className="aviso" role="status">{aviso}</p>}
      <CrearUsuario onCreado={username => { setAviso(`Usuario ${username} creado con el rol USER`); setVersion(v => v + 1) }} />

      {porPromover && (
        <Confirmacion titulo={`¿Hacer administrador a ${porPromover.username}?`} confirmar="Hacer administrador" ocupado={ocupado}
          onConfirmar={() => void promover(porPromover)} onCancelar={() => setPorPromover(null)}>
          <p>Podrá administrar el catálogo, las compras, anular facturas y ver los reportes. AuthCore no permite quitar un rol después.</p>
        </Confirmacion>
      )}

      <h2>Usuarios registrados</h2>
      <MensajeError mensaje={error ?? actual?.error ?? null} />
      {!actual && <p className="loading">Cargando...</p>}
      {actual?.usuarios && (
        <div className="table-container">
          <table aria-label="Usuarios registrados">
            <thead><tr><th>Usuario</th><th>Roles</th><th></th></tr></thead>
            <tbody>
              {actual.usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.username}{u.username === user?.username && ' (usted)'}</td>
                  <td>{[...u.roles].sort().map(r => <span key={r} className={`badge ${r === 'ADMIN' ? 'badge-info' : 'badge-success'}`}>{r}</span>)}</td>
                  <td>
                    {!u.roles.includes('ADMIN') && (
                      <button type="button" className="btn btn-secondary" onClick={() => { setAviso(null); setPorPromover(u) }}>
                        Hacer administrador
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
