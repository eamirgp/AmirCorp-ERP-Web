/**
 * Números para mostrar: punto para los decimales y un espacio para los miles ("S/ 1 234.50"), sin comas,
 * para que nadie confunda comas con puntos. Es el mismo formato que usa la API en sus textos.
 * El espacio es U+00A0: se ve bien en la fuente de la aplicación (el espacio fino U+202F casi no se nota)
 * y no deja que un número se parta en dos líneas.
 */
export const THOUSANDS = ' '

const withThinSpaces = (f: Intl.NumberFormat, value: number) =>
  f
    .formatToParts(value)
    .map((p) => (p.type === 'group' ? THOUSANDS : p.type === 'decimal' ? '.' : p.value))
    .join('')

const integer = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 6 })
const moneyFormats = new Map<string, Intl.NumberFormat>()

/** Monto en la moneda indicada por la API: "S/ 1 234.50", "US$ 1 234.50". */
export function formatMoney(value: number, currency: string | null | undefined) {
  const code = currency ?? 'PEN'
  let f = moneyFormats.get(code)
  if (!f) {
    f = new Intl.NumberFormat('es-PE', { style: 'currency', currency: code, minimumFractionDigits: 2 })
    moneyFormats.set(code, f)
  }
  return withThinSpaces(f, value)
}

/** S/ 1 234.50 */
export const formatPen = (value: number) => formatMoney(value, 'PEN')

const amount = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Monto sin símbolo de moneda, para columnas donde la moneda ya se sabe: 1 234.50 */
export const formatAmount = (value: number) => withThinSpaces(amount, value)

/** 1 234 */
export const formatInt = (value: number) => withThinSpaces(integer, value)

/** Cantidad o costo con hasta 6 decimales, sin ceros de más: 12.5, 1 250.083333 */
export const formatDecimal = (value: number) => withThinSpaces(decimal, value)

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
