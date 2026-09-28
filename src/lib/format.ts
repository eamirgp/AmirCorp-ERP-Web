const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })
const integer = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** S/ 1,234.50 */
export const formatPen = (value: number) => soles.format(value)

/** 1,234 */
export const formatInt = (value: number) => integer.format(value)
