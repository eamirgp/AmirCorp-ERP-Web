import { THOUSANDS } from './format'

/**
 * Números escritos a mano (precios, cantidades, tipo de cambio). La regla es una sola y sin adivinar:
 * punto para los decimales; los miles se pueden separar con espacios o no separar ("1500.50", "1 500.50").
 * La coma no se acepta, porque "1,500" podría leerse como mil quinientos o como uno y medio.
 * Es lectura de lo que escribió el usuario, no una regla de negocio: la API valida el valor.
 */

export const COMMA_MESSAGE = 'Usa punto para los decimales. No uses comas.'

export const NOT_A_NUMBER_MESSAGE = 'Escribe solo números, con punto para los decimales.'

// Un número de JavaScript guarda unas 15 cifras: con más se redondearía sin aviso al enviarlo.
const MAX_DIGITS = 15
export const TOO_MANY_DIGITS_MESSAGE = 'El número tiene demasiadas cifras. Revisa que esté bien escrito.'

// El símbolo de soles solo al inicio, con o sin su punto: "S/. 1500" es mil quinientos, no 0.1500.
const CURRENCY_SYMBOL = /^S\/\.?\s*/i
const SPACES = /[\s   ]/g
// Acepta "12", "12.5", "12." y ".5".
const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/

/**
 * Lo escrito sin el símbolo de soles ni espacios, o null si después del símbolo no viene un número ("S/ .50" no se
 * adivina).
 */
function clean(value: string | undefined): string | null {
  const text = (value ?? '').trim()
  const number = text.replace(CURRENCY_SYMBOL, '')
  if (number !== text && !/^\d/.test(number)) return null
  return number.replace(SPACES, '')
}

const digitsOf = (text: string) => text.replace(/[^\d]/g, '').replace(/^0+/, '').length

/** Si lo escrito tiene una coma (se muestra el aviso en el campo). */
export const hasComma = (value: string | undefined) => (value ?? '').includes(',')

/**
 * Por qué lo escrito no se puede leer como número, o null si se puede (o si está vacío). Sin este aviso, un texto como
 * "12a" viajaría vacío y la API respondería "es requerido", que confunde.
 */
export function numberInputProblem(value: string | undefined): string | null {
  if (hasComma(value)) return COMMA_MESSAGE
  const text = clean(value)
  if (text === '') return null
  if (text === null || !NUMBER.test(text)) return NOT_A_NUMBER_MESSAGE
  return digitsOf(text) > MAX_DIGITS ? TOO_MANY_DIGITS_MESSAGE : null
}

/** El número escrito, o null si está vacío, tiene coma o no es un número (la API responde el mensaje). */
export function parseNumberInput(value: string | undefined): number | null {
  const text = clean(value)
  if (!text || !NUMBER.test(text) || digitsOf(text) > MAX_DIGITS) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/**
 * Lo escrito, reordenado para leerlo fácil al salir del campo: "1500.5" → "1 500.50".
 * Nunca redondea: trabaja sobre el texto, solo agrega ceros hasta `minDecimals` y separa los miles. Si no es un número,
 * lo deja igual.
 */
export function formatNumberInput(value: string | number | undefined, minDecimals = 0): string {
  const original = typeof value === 'number' ? String(value) : (value ?? '')
  const text = clean(original)
  if (!text || !NUMBER.test(text) || digitsOf(text) > MAX_DIGITS) return original

  const negative = text.startsWith('-')
  const [rawInt, dec = ''] = (negative ? text.slice(1) : text).split('.')
  // "007" es 7 y ".5" es 0.5.
  const int = rawInt.replace(/^0+(?=\d)/, '') || '0'
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS)
  const decimals = dec.padEnd(minDecimals, '0')
  return `${negative ? '-' : ''}${grouped}${decimals ? `.${decimals}` : ''}`
}
