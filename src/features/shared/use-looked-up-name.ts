import { useEffect, useRef, type DependencyList, type KeyboardEvent } from 'react'

/** El número de documento sin espacios, como se consulta ("20 123 456 789" es "20123456789"). */
export const compactDocument = (n: string | undefined) => n?.replace(/\s/g, '') ?? ''

/**
 * El nombre que llena una consulta a SUNAT o RENIEC en un formulario (clientes y proveedores, empresas):
 * - Si el documento cambia y el nombre sigue siendo el que trajo la consulta, ya no corresponde: se borra para que la
 *   consulta del número nuevo lo llene. Un nombre escrito a mano se respeta.
 * - Una respuesta que llega tarde, cuando el número ya es otro, no llena el nombre.
 */
export function useLookedUpName({
  getName,
  setName,
  getDocument,
  onDocumentChange,
  deps,
}: {
  getName: () => string
  setName: (name: string) => void
  getDocument: () => string
  /** Al cambiar el documento (por ejemplo, olvidar el resultado de la consulta anterior). */
  onDocumentChange?: () => void
  /** Lo que cuenta como "otro documento": abrir el formulario, el tipo y el número. */
  deps: DependencyList
}) {
  const lookedUp = useRef('')

  useEffect(() => {
    onDocumentChange?.()
    if (lookedUp.current && getName() === lookedUp.current) setName('')
    lookedUp.current = ''
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  /** Si el número consultado sigue siendo el del formulario. */
  const isCurrent = (asked: string) => compactDocument(getDocument()) === compactDocument(asked)

  return {
    isCurrent,
    /** Llena el nombre con lo que trajo la consulta del número `asked`, si todavía es el del formulario. */
    fill: (name: string, asked: string) => {
      if (!isCurrent(asked)) return
      setName(name)
      lookedUp.current = name
    },
  }
}

/** Enter en el número hace la consulta (como el botón) y no envía el formulario. */
export const lookupOnEnter = (canLookup: () => boolean, lookup: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  if (canLookup()) lookup()
}
