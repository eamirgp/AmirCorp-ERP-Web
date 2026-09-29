const thousandsOnly = /^-?\d{1,3}(,\d{3})+$/

/**
 * Lee un número escrito en un campo de texto, como se escribe en Perú (es lectura de lo que escribió el usuario,
 * no una regla de negocio; la API valida el valor). Misma regla que usa la API para los precios del Excel:
 *   "12.90" → 12.9     "12,90" → 12.9     "1,500" → 1500     "1,234.50" → 1234.5     "S/ 12.90" → 12.9
 * Si no es un número, devuelve null y la API responde con el mensaje correspondiente.
 */
export function parseNumberInput(value: string | undefined): number | null {
  let text = (value ?? '').replace(/S\//gi, '').replace(/\s/g, '')
  if (text === '') return null

  // Con punto, o con comas en grupos de 3 dígitos, la coma es de miles; si no, es la coma decimal.
  text = text.includes(',') && (text.includes('.') || thousandsOnly.test(text)) ? text.replace(/,/g, '') : text.replace(',', '.')

  const n = Number(text)
  return Number.isFinite(n) ? n : null
}
