import { THOUSANDS } from './format'

/**
 * Números escritos a mano (precios, cantidades, tipo de cambio). La regla es una sola y sin adivinar:
 * punto para los decimales; los miles se pueden separar con espacios o no separar ("1500.50", "1 500.50").
 * La coma no se acepta, porque "1,500" podría leerse como mil quinientos o como uno y medio.
 * Es lectura de lo que escribió el usuario, no una regla de negocio: la API valida el valor.
 */

export const COMMA_MESSAGE = 'Usa punto para los decimales. No uses comas.'

const clean = (value: string | undefined) => (value ?? '').replace(/S\//gi, '').replace(/[\s   ]/g, '')

/** Si lo escrito tiene una coma (se muestra el aviso en el campo). */
export const hasComma = (value: string | undefined) => (value ?? '').includes(',')

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
