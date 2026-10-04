import { createContext, useContext } from 'react'

/**
 * Si el campo está dentro de un `Field` (formulario): entonces mide 56 px y su etiqueta va adentro y sube al escribir.
 * Fuera de un `Field` (una celda de tabla, un filtro) es compacto, de 36 px, y se nombra con `aria-label`.
 */
export const FieldContext = createContext(false)

// Como Cuenta de Apple: enfocado, borde azul (y el anillo solo con teclado, `kbd:`); con error y sin foco, borde rojo
// y fondo rosado. Al enfocarlo para corregir vuelve a verse como un campo normal.
const base =
  'w-full min-w-0 border border-field-line bg-field text-fg outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-apple focus:border-accent kbd:focus:shadow-focus aria-[invalid=true]:not-focus:border-bad aria-[invalid=true]:not-focus:bg-field-bad aria-[invalid=true]:not-focus:[--autofill-fill:var(--field-bad)] disabled:border-rule disabled:bg-muted-fill disabled:text-fg-muted'
const floating = 'h-14 rounded-xl pt-[22px] pb-1.5 px-4 text-apple'
const compact = 'h-9 rounded-[10px] px-3 text-sm placeholder:text-fg-muted'

/** Si el control está dentro de un `Field`. */
export const useInField = () => useContext(FieldContext)

/** Clases del recuadro de un campo: de formulario (56 px) o compacto (36 px). */
export function useControlClass() {
  return `${base} ${useInField() ? floating : compact}`
}
