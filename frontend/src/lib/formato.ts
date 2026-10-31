const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })

/** Formats an amount sent by the server. Display only: the official values always come from the server. */
export function formatearPesos(valor: number): string {
  return PESOS.format(valor)
}
