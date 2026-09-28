import { useEffect, useState } from 'react'

/** Devuelve el valor recién cuando deja de cambiar durante `ms` milisegundos. */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  const key = JSON.stringify(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
    // Se compara por contenido, no por referencia: un objeto nuevo con los mismos datos no reinicia la espera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms])

  return debounced
}
