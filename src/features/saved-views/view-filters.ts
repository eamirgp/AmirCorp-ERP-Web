import type { QueryClient } from '@tanstack/react-query'
import { defaultStringifySearch, redirect, type ParsedLocation } from '@tanstack/react-router'
import { savedViewsQuery, type SavedViewScreen } from '@/api/saved-views'

/**
 * Parámetros de la URL que no forman parte de una vista: la página actual y los diálogos abiertos.
 * Todo lo demás (búsqueda, filtros, orden, filas por página) se guarda tal cual.
 */
const TRANSIENT = new Set(['page', 'nuevo', 'editar', 'importar'])

type Search = Record<string, unknown>

/** Filtros de la pantalla como texto estable (claves ordenadas) para guardarlos y compararlos. */
export function toFilters(search: Search): string {
  const kept = Object.keys(search)
    .filter((k) => !TRANSIENT.has(k) && search[k] !== undefined && search[k] !== '')
    .sort()
    .map((k) => [k, search[k]])
  return JSON.stringify(Object.fromEntries(kept))
}

/** Filtros guardados como parámetros de la URL. Si el texto está dañado, la vista abre sin filtros. */
export function fromFilters(filters: string): Search {
  try {
    const parsed: unknown = JSON.parse(filters)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Search) : {}
  } catch {
    return {}
  }
}

/**
 * Para el `beforeLoad` de una ruta de lista: al entrar a la pantalla sin filtros en la URL (desde el menú,
 * un link o recargando), aplica la vista predeterminada del usuario. Dentro de la pantalla no hace nada:
 * "Limpiar filtros" muestra todo, como se espera.
 */
export function applyDefaultView(screen: SavedViewScreen) {
  return async ({ context, cause, location }: { context: { queryClient: QueryClient }; cause: 'preload' | 'enter' | 'stay'; location: ParsedLocation }) => {
    if (cause !== 'enter' || location.searchStr !== '') return

    const views = await context.queryClient.ensureQueryData(savedViewsQuery(screen)).catch(() => [])
    const view = views.find((v) => v.isDefault)
    if (!view) return

    const search = fromFilters(view.filters)
    if (Object.keys(search).length === 0) return

    throw redirect({ href: `${location.pathname}${defaultStringifySearch(search)}`, replace: true })
  }
}
