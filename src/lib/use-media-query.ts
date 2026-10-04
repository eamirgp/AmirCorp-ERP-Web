import { useSyncExternalStore } from 'react'

/** Si la pantalla cumple una media query; se actualiza al girar el celular o cambiar el tamaño de la ventana. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

/**
 * Celular: más angosto que el punto `md` de Tailwind (768 px). Ahí las listas pasan de tabla a filas como las del iPhone
 * y los botones del encabezado se resumen en "⋯" y "+". Una tableta en vertical ya ve la tabla.
 */
export const useIsPhone = () => !useMediaQuery('(min-width: 48rem)')
