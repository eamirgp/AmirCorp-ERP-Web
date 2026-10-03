import { z } from 'zod'
import type { Option } from '@/components/ui/filters'
import { formatInt } from './format'

export type ActiveFilter = 'activos' | 'inactivos'

/** Opciones del filtro "Estado" que comparten todas las listas. Sin filtro se ven todos. */
export const statusOptions: Option<ActiveFilter>[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]

export const statusSchema = z.enum(['activos', 'inactivos']).optional().catch(undefined)
export const directionSchema = z.enum(['asc', 'desc']).optional().catch(undefined)
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
