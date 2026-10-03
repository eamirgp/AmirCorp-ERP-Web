import { THOUSANDS } from './format'

/**
 * Números escritos a mano (precios, cantidades, tipo de cambio). La regla es una sola y sin adivinar:
 * punto para los decimales; los miles se pueden separar con espacios o no separar ("1500.50", "1 500.50").
 * La coma no se acepta, porque "1,500" podría leerse como mil quinientos o como uno y medio.
 * Es lectura de lo que escribió el usuario, no una regla de negocio: la API valida el valor.
 */

export const COMMA_MESSAGE = 'Usa punto para los decimales. No uses comas.'

const clean = (value: string | undefined) => (value ?? '').replace(/S\//gi, '').replace(/[\s   ]/g, '')

export const NOT_A_NUMBER_MESSAGE = 'Escribe solo números, con punto para los decimales.'

/** Si lo escrito tiene una coma (se muestra el aviso en el campo). */
export const hasComma = (value: string | undefined) => (value ?? '').includes(',')

/**
 * Por qué lo escrito no se puede leer como número, o null si se puede (o si está vacío). Sin este aviso, un texto como
 * "12a" viajaría vacío y la API respondería "es requerido", que confunde.
 */
export const numberInputProblem = (value: string | undefined): string | null =>
  hasComma(value) ? COMMA_MESSAGE : clean(value) !== '' && parseNumberInput(value) === null ? NOT_A_NUMBER_MESSAGE : null

/** El número escrito, o null si está vacío, tiene coma o no es un número (la API responde el mensaje). */
export function parseNumberInput(value: string | undefined): number | null {
  const text = clean(value)
  // Acepta "12", "12.5", "12." y ".5".
  if (text === '' || text.includes(',') || !/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/**
 * Lo escrito, reordenado para leerlo fácil al salir del campo: "1500.5" → "1 500.50".
 * Nunca redondea: solo agrega ceros hasta `minDecimals` y separa los miles. Si no es un número, lo deja igual.
 */
export function formatNumberInput(value: string | number | undefined, minDecimals = 0): string {
  const n = typeof value === 'number' ? value : parseNumberInput(value)
  if (n === null || n === undefined) return typeof value === 'string' ? value : ''

  const [int, dec = ''] = Math.abs(n).toString().split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS)
  const decimals = dec.padEnd(minDecimals, '0')
  return `${n < 0 ? '-' : ''}${grouped}${decimals ? `.${decimals}` : ''}`
}
