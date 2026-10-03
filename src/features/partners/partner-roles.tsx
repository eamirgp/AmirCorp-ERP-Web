import { Truck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import type { PartnerApiRole, PartnerRole, PartnerRow } from '@/api/partners'
import type { SavedViewScreen } from '@/api/saved-views'
import { directionSchema, pageSchema, pageSizeSchema } from '@/lib/filters'

export const partnerSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  // Estado del rol de la lista: en Proveedores, si sus compras están bloqueadas; en Clientes, sus ventas.
  estado: z.enum(['activos', 'bloqueados']).optional().catch(undefined),
  doc: z.enum(['Ruc', 'Dni', 'TributarioExtranjero']).optional().catch(undefined),
  orden: z.enum(['Name', 'CreatedAt', 'DocumentNumber']).optional().catch(undefined),
  dir: directionSchema,
  nuevo: z.boolean().optional().catch(undefined),
})
export type PartnerSearch = z.infer<typeof partnerSearchSchema>

/**
 * Clientes y proveedores son el mismo registro (una empresa puede ser ambos), pero se muestran en dos listas:
 * Clientes en Comercial y Proveedores en Abastecimiento. Cada lista filtra por su rol y bloquea solo su rol
 * (compras o ventas), como el Business Partner de SAP.
 */
export interface RoleConfig {
  role: PartnerRole
  apiRole: PartnerApiRole
  screen: SavedViewScreen
  title: string
  description: string
  newLabel: string
  searchPlaceholder: string
  loading: string
  emptyTitle: string
  emptyText: string
  icon: ReactNode
  /** Qué decir si el registro también tiene el otro rol. */
  alsoOther: string
  blockLabel: string
  unblockLabel: string
  blockedFilterLabel: string
  /** El bloqueo, su motivo y el estado (texto de la API) del rol de esta lista. */
  isBlocked: (p: PartnerRow) => boolean
  blockReason: (p: PartnerRow) => string | null
  status: (p: PartnerRow) => string
}

export const partnerRoles: Record<'clients' | 'suppliers', RoleConfig> = {
  clients: {
    role: 'clientes',
    apiRole: 'Client',
    screen: 'Clients',
    title: 'Clientes',
    description: 'A quienes les vendes, con RUC o DNI. Compartidos por todas tus empresas.',
    newLabel: 'Nuevo cliente',
    searchPlaceholder: 'Buscar clientes',
    loading: 'Cargando clientes…',
    emptyTitle: 'Todavía no hay clientes',
    emptyText: 'Registra a las empresas y personas a las que les vendes.',
    icon: <Users strokeWidth={1.5} />,
    alsoOther: 'También es proveedor',
    blockLabel: 'Bloquear ventas',
    unblockLabel: 'Desbloquear ventas',
    blockedFilterLabel: 'Ventas bloqueadas',
    isBlocked: (p) => p.isSalesBlocked,
    blockReason: (p) => p.salesBlockReason,
    status: (p) => p.clientStatus,
  },
  suppliers: {
    role: 'proveedores',
    apiRole: 'Supplier',
    screen: 'Suppliers',
    title: 'Proveedores',
    description: 'A quienes les compras, en Perú (RUC) y en el extranjero. Compartidos por todas tus empresas.',
    newLabel: 'Nuevo proveedor',
    searchPlaceholder: 'Buscar proveedores',
    loading: 'Cargando proveedores…',
    emptyTitle: 'Todavía no hay proveedores',
    emptyText: 'Registra a tus proveedores nacionales y del extranjero.',
    icon: <Truck strokeWidth={1.5} />,
    alsoOther: 'También es cliente',
    blockLabel: 'Bloquear compras',
    unblockLabel: 'Desbloquear compras',
    blockedFilterLabel: 'Compras bloqueadas',
    isBlocked: (p) => p.isPurchasingBlocked,
    blockReason: (p) => p.purchasingBlockReason,
    status: (p) => p.supplierStatus,
  },
}

/** Parámetros de la API para la lista. Sin orden en la URL, la API usa el suyo por defecto. */
export const partnerListParams = (role: PartnerRole, s: PartnerSearch) => ({
  q: s.q,
  page: s.page ?? 1,
  pageSize: s.filas,
  status: s.estado,
  role,
  documentType: s.doc,
  sortBy: s.orden,
  descending: s.orden ? s.dir === 'desc' : undefined,
})
