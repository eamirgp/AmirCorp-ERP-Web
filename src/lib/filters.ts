import { z } from 'zod'
import { formatInt } from './format'

/** Una opción de un filtro: el valor que va en la URL y el texto que se ve. */
export interface Option<T extends string> {
  value: T
  label: string
}

export type ActiveFilter = 'activos' | 'inactivos'

/** Opciones del filtro "Estado" que comparten todas las listas. Sin filtro se ven todos. */
export const statusOptions: Option<ActiveFilter>[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]

export const statusSchema = z.enum(['activos', 'inactivos']).optional().catch(undefined)
export const directionSchema = z.enum(['asc', 'desc']).optional().catch(undefined)

/** El orden que muestran la tabla y el menú "Ordenar": el elegido (en la URL) o, si no se eligió ninguno, el que aplicó la API. */
export function shownSort<T extends string>(orden: T | undefined, dir: 'asc' | 'desc' | undefined, applied: { sortBy: T; sortDescending: boolean } | undefined) {
  if (orden) return { by: orden, descending: dir === 'desc' }
  return applied && { by: applied.sortBy, descending: applied.sortDescending }
}

/**
 * Clic en el título de una columna (como en la Mac): si la lista ya está ordenada por ella, invierte el orden; si no,
 * la ordena por ella, de menor a mayor (o de mayor a menor en fechas y montos). Se calcula sobre la última URL pedida
 * (`prev` de navigate), no sobre la pantalla: así dos clics seguidos invierten aunque la lista nueva no haya llegado.
 */
export function nextSort<T extends string>(
  prev: { orden?: T; dir?: 'asc' | 'desc' },
  by: T,
  descendingFirst: boolean,
  applied: { sortBy: T; sortDescending: boolean } | undefined,
) {
  const current = shownSort(prev.orden, prev.dir, applied)
  const descending = current?.by === by ? !current.descending : descendingFirst
  return { orden: by, dir: descending ? ('desc' as const) : ('asc' as const) }
}
export const pageSchema = z.coerce.number().int().min(1).optional().catch(undefined)
/** Filas por página elegidas en la pantalla. Sin valor, la API usa su tamaño por defecto y ajusta los que no acepta. */
export const pageSizeSchema = z.coerce.number().int().min(1).optional().catch(undefined)

/** Convierte el filtro de la URL al parámetro IsActive de la API (undefined = todos). */
export const toIsActive = (filter: ActiveFilter | undefined): boolean | undefined => (filter === undefined ? undefined : filter === 'activos')

/** Búsqueda y estado de las listas cortas (empresas, usuarios, unidades): los filtra la API, igual que en las largas. */
export interface ListFilter {
  q?: string
  estado?: ActiveFilter
}

/** Solo la búsqueda y el estado de la URL (abrir el formulario "nuevo" no vuelve a pedir la lista). */
export const listFilterOf = ({ q, estado }: ListFilter): ListFilter => ({ q, estado })

/** El filtro de la URL como lo espera la API. */
export const toListFilterQuery = (f: ListFilter) => ({ SearchTerm: f.q || undefined, IsActive: toIsActive(f.estado) })

/** "57 productos", "1 producto" */
export const countLabel = (n: number, singular: string, plural: string) => `${formatInt(n)} ${n === 1 ? singular : plural}`
