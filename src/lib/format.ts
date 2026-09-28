const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })
const integer = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** S/ 1,234.50 */
export const formatPen = (value: number) => soles.format(value)

/** 1,234 */
export const formatInt = (value: number) => integer.format(value)

const moneyFormats = new Map<string, Intl.NumberFormat>()

/** Monto en la moneda indicada por la API: "S/ 1,234.50", "US$ 1,234.50". */
export function formatMoney(value: number, currency: string | null | undefined) {
  const code = currency ?? 'PEN'
  let f = moneyFormats.get(code)
  if (!f) {
    f = new Intl.NumberFormat('es-PE', { style: 'currency', currency: code, minimumFractionDigits: 2 })
    moneyFormats.set(code, f)
  }
  return f.format(value)
}

const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 6 })

/** Cantidad o costo con hasta 6 decimales, sin ceros de más: 12.5, 0.083333 */
export const formatDecimal = (value: number) => decimal.format(value)

/** Fecha de la API (yyyy-mm-dd) como dd/mm/yyyy, sin convertir zonas horarias. */
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Los registros se muestran en hora de Perú, aunque el equipo esté configurado en otra zona.
const dateTime = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

/** Momento de la API (UTC) en hora de Perú: 28/09/2026 14:27 */
export const formatDateTime = (instant: string) => dateTime.format(new Date(instant)).replace(',', '')

/** Fecha de hoy en la zona del navegador, en formato yyyy-mm-dd para un campo de fecha. */
export function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}
