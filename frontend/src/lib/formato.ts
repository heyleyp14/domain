const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })

/** Formats an amount sent by the server. Display only: the official values always come from the server. */
export function formatearPesos(valor: number): string {
  return PESOS.format(valor)
}

const PESOS_COMPACTO = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1,
})

/** Compact pesos for crowded labels such as chart axis ticks: "$ 1,3 M". Amounts in detail use formatearPesos. */
export function formatearPesosCompacto(valor: number): string {
  return PESOS_COMPACTO.format(valor)
}
