import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { FacturaResponse } from '../api/domain'
import { anularFactura, obtenerFactura } from '../api/ventas'
import { useAuth } from '../auth/useAuth'
import { FacturaDetalle } from '../components/FacturaDetalle'
import { Input, MensajeError, Textarea } from '../components/FormFields'

const NUMERO = /^FAC-\d{4}-\d{6}$/

/** Cancellation form (ADMIN): the reason is mandatory, 5 to 300 characters (Factura.java). */
function Anulacion({ factura, onAnulada, onCancelar }: {
  factura: FacturaResponse
  onAnulada: (f: FacturaResponse) => void
  onCancelar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const texto = motivo.trim()
    if (texto.length < 5 || texto.length > 300) {
      setErrorMotivo('Escriba el motivo, entre 5 y 300 caracteres')
      return
    }
    setEnviando(true)
    try {
      onAnulada(await anularFactura(factura.numero, texto))
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && /motivo/i.test(err.message)) setErrorMotivo(err.message)
      else setError(err instanceof Error ? err.message : 'No se pudo anular la factura')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card confirmacion" onSubmit={enviar} noValidate aria-label={`Anular ${factura.numero}`}>
      <h3>¿Anular la factura {factura.numero}?</h3>
      <p>
        La factura queda ANULADA, el stock de cada producto vuelve al inventario y deja de sumar en el reporte
        diario. Esta acción no se puede deshacer.
      </p>
      <Textarea label="Motivo de la anulación" value={motivo} error={errorMotivo} rows={3} maxLength={300} autoFocus
        onChange={e => { setMotivo(e.target.value); setErrorMotivo(undefined) }} />
      <MensajeError mensaje={error} />
      <div className="acciones">
        <button type="submit" className="btn btn-danger" disabled={enviando}>{enviando ? 'Anulando...' : 'Anular factura'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={enviando}>Cancelar</button>
      </div>
    </form>
  )
}

/**
 * Invoices (HU-9): look up an invoice by its number, see it, download its PDF and, for ADMIN, cancel it.
 * The server has no invoice list; the daily report (T3.8) lists the invoices of a day and links here.
 * The number travels in the URL (?numero=FAC-...), so a link opens the invoice directly.
 */
export function Facturas() {
  const { hasRole } = useAuth()
  const esAdmin = hasRole('ADMIN')
  const [params, setParams] = useSearchParams()
  const numero = (params.get('numero') ?? '').trim().toUpperCase()

  const [texto, setTexto] = useState(numero)
  const [errorNumero, setErrorNumero] = useState<string | undefined>()
  const [respuesta, setRespuesta] = useState<{ numero: string; factura?: FacturaResponse; error?: string } | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!numero) return
    let vigente = true
    obtenerFactura(numero)
      .then(factura => vigente && setRespuesta({ numero, factura }))
      .catch(e => vigente && setRespuesta({ numero, error: e instanceof Error ? e.message : 'No se pudo consultar la factura' }))
    return () => {
      vigente = false
    }
  }, [numero])

  const actual = numero && respuesta?.numero === numero ? respuesta : null
  const cargando = Boolean(numero) && !actual

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const n = texto.trim().toUpperCase()
    if (!NUMERO.test(n)) {
      setErrorNumero('Escriba el número completo, por ejemplo FAC-2026-000001')
      return
    }
    setAviso(null)
    setAnulando(false)
    setParams({ numero: n })
  }

  const alAnular = (f: FacturaResponse) => {
    setRespuesta({ numero: f.numero, factura: f })
    setAnulando(false)
    setAviso(`Factura ${f.numero} anulada; el stock de sus productos volvió al inventario.`)
  }

  const factura = actual?.factura
  return (
    <section className="pagina">
      <h1>Facturas</h1>
      <form className="filtros" role="search" onSubmit={buscar} noValidate>
        <Input label="Número de factura" value={texto} error={errorNumero} placeholder="FAC-2026-000001" autoFocus
          onChange={e => { setTexto(e.target.value.toUpperCase()); setErrorNumero(undefined) }} />
        <button type="submit" className="btn btn-primary">Buscar</button>
      </form>

      {aviso && <p className="aviso" role="status">{aviso}</p>}
      {cargando && <p className="loading">Buscando...</p>}
      <MensajeError mensaje={actual?.error ?? null} />
      {!numero && <p className="ayuda-campo">Las facturas de un día aparecen en el reporte diario.</p>}

      {factura && (
        <FacturaDetalle
          factura={factura}
          acciones={esAdmin && factura.estado === 'EMITIDA' && !anulando && (
            <button type="button" className="btn btn-danger" onClick={() => { setAviso(null); setAnulando(true) }}>
              Anular factura
            </button>
          )}
        />
      )}
      {factura && anulando && <Anulacion factura={factura} onAnulada={alAnular} onCancelar={() => setAnulando(false)} />}
    </section>
  )
}
