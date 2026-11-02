/**
 * Today's date in Bogotá as AAAA-MM-DD. Do not use new Date().toISOString(): that is the UTC date, which
 * after 7 p.m. in Colombia is already tomorrow, and the server rejects purchases dated in the future.
 */
export function hoyEnBogota(ahora: Date = new Date()): string {
  // en-CA formats dates as AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })

/** Shows an AAAA-MM-DD date (a calendar day, no time zone) as "30 oct 2026". */
export function formatearDia(dia: string): string {
  return FECHA_LARGA.format(new Date(`${dia}T00:00:00Z`))
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/**
 * Short label for chart axes: "30 oct". Anchors the calendar day at UTC midnight, so it never slips to
 * the previous day in Bogotá the way `new Date("2026-10-30")` does.
 */
export function formatearDiaCorto(dia: string): string {
  return FECHA_CORTA.format(new Date(`${dia}T00:00:00Z`))
}
