import { z } from 'zod'
import type { Option } from '@/components/ui/filters'

export type ActiveFilter = 'activos' | 'inactivos'

/** Opciones del filtro "Estado" que comparten todas las listas. Sin filtro se ven todos. */
export const statusOptions: Option<ActiveFilter>[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]

export const statusSchema = z.enum(['activos', 'inactivos']).optional().catch(undefined)
export const directionSchema = z.enum(['asc', 'desc']).optional().catch(undefined)

/** Convierte el filtro de la URL al parámetro IsActive de la API (undefined = todos). */
export const toIsActive = (filter: ActiveFilter | undefined): boolean | undefined => (filter === undefined ? undefined : filter === 'activos')

/** "57 productos", "1 producto" */
export const countLabel = (n: number, singular: string, plural: string) => `${n.toLocaleString('es-PE')} ${n === 1 ? singular : plural}`
