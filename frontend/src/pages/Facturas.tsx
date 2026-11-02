import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { ApiError } from '../api/client'
import type { FacturaResponse } from '../api/domain'
import { anularFactura, obtenerFactura } from '../api/ventas'
import { useAuth } from '../auth/useAuth'
import { CampoArea, CampoTexto } from '../components/Campo'
import { FacturaDetalle } from '../components/FacturaDetalle'
import { MensajeError } from '../components/FormFields'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { usePaginaUrl } from '../hooks/usePaginaUrl'

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
    <form onSubmit={enviar} noValidate aria-label={`Anular ${factura.numero}`}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">¿Anular la factura {factura.numero}?</h3>
        <p className="text-sm text-muted-foreground">
          La factura queda ANULADA, el stock de cada producto vuelve al inventario y deja de sumar en el reporte
          diario. Esta acción no se puede deshacer.
        </p>
      </div>
      <CampoArea id="motivo-anulacion" label="Motivo de la anulación" value={motivo} error={errorMotivo}
        rows={3} maxLength={300} autoFocus
        onChange={e => { setMotivo(e.target.value); setErrorMotivo(undefined) }} />
      <MensajeError mensaje={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={enviando}>{enviando ? 'Anulando...' : 'Anular factura'}</Button>
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
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
  const lineasPag = usePaginaUrl('paginaLineas')
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

  const limpiar = () => {
    setTexto('')
    setErrorNumero(undefined)
    setRespuesta(null)
    setAviso(null)
    setAnulando(false)
    setParams({})
  }

  const alAnular = (f: FacturaResponse) => {
    setRespuesta({ numero: f.numero, factura: f })
    setAnulando(false)
    setAviso(`Factura ${f.numero} anulada; el stock de sus productos volvió al inventario.`)
  }

  const factura = actual?.factura
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm text-muted-foreground">Consulta por número, revisa el detalle y descarga el PDF.</p>
        </div>
        {esAdmin && (
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/reporte">Ver reporte diario</Link>
          </Button>
        )}
      </header>

      <Card className="p-4">
        <form role="search" onSubmit={buscar} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <CampoTexto id="numero-factura" label="Número de factura" className="flex-1" value={texto}
            error={errorNumero} placeholder="FAC-2026-000001" autoFocus autoComplete="off" maxLength={20}
            onChange={e => { setTexto(e.target.value.toUpperCase()); setErrorNumero(undefined) }} />
          <div className="flex gap-2">
            <Button type="submit" className="min-h-[44px]">Buscar</Button>
            {(numero || texto) && (
              <Button type="button" variant="ghost" onClick={limpiar} className="min-h-[44px]">Limpiar</Button>
            )}
          </div>
        </form>
      </Card>

      {aviso && (
        <p role="status" className="rounded-lg border border-border bg-[var(--pill-positive-bg)] px-4 py-3 text-sm text-[var(--pill-positive-ink)]">
          {aviso}
        </p>
      )}
      <MensajeError mensaje={actual?.error ?? null} />

      {cargando && (
        <>
          <p className="sr-only">Buscando factura...</p>
          <Card className="p-4" aria-hidden="true">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton mt-4 h-40 w-full" />
          </Card>
        </>
      )}

      {!numero && (
        <Card className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <FileSearch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Busca una factura para ver su detalle</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Escribe el número completo, por ejemplo FAC-2026-000001. Las facturas de un día aparecen en el reporte diario.
          </p>
        </Card>
      )}

      {factura && (
        <FacturaDetalle
          factura={factura}
          pagina={lineasPag.pagina}
          onCambiarPagina={n => lineasPag.irAPagina(n)}
          acciones={esAdmin && factura.estado === 'EMITIDA' && !anulando && (
            <Button type="button" variant="destructive" onClick={() => { setAviso(null); setAnulando(true) }}>
              Anular factura
            </Button>
          )}
        />
      )}
      {factura && anulando && <Anulacion factura={factura} onAnulada={alAnular} onCancelar={() => setAnulando(false)} />}
    </section>
  )
}
