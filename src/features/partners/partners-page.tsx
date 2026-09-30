import { useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { Ban, HistoryIcon, LockOpen, Pencil, Plus, Truck, UserPlus, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import {
  partnerListQuery,
  useAddPartnerRole,
  useBlockPartnerRole,
  type BlockFilter,
  type PartnerApiRole,
  type PartnerRole,
  type PartnerRow,
  type PartnerSortBy,
} from '@/api/partners'
import type { SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { DataTable, RowMenu } from '@/components/ui/data-table'
import { FilterBar, SortMenu, type Option } from '@/components/ui/filters'
import { EmptyState, ListPanel, Loading, Pagination, SearchBox } from '@/components/ui/list-controls'
import { ErrorList, PageHeader, Pill } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { BlockRoleDialog } from '@/features/partners/block-role-dialog'
import { PartnerFormDialog } from '@/features/partners/partner-form-dialog'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { isCustomized } from '@/features/saved-views/view-filters'
import { directionSchema, pageSchema, pageSizeSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

export const partnerSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  // Estado del rol de la lista: en Proveedores, si sus compras están bloqueadas; en Clientes, sus ventas.
  estado: z.enum(['activos', 'bloqueados']).optional().catch(undefined),
  doc: z.enum(['Ruc', 'Dni', 'TributarioExtranjero']).optional().catch(undefined),
  orden: z.enum(['Name', 'CreatedAt']).optional().catch(undefined),
  dir: directionSchema,
  nuevo: z.boolean().optional().catch(undefined),
})
export type PartnerSearch = z.infer<typeof partnerSearchSchema>

/**
 * Clientes y proveedores son el mismo registro (una empresa puede ser ambos), pero se muestran en dos listas:
 * Clientes en Comercial y Proveedores en Abastecimiento. Cada lista filtra por su rol y bloquea solo su rol
 * (compras o ventas), como el Business Partner de SAP.
 */
interface RoleConfig {
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

const sortOptions: Option<PartnerSortBy>[] = [
  { value: 'Name', label: 'Nombre' },
  { value: 'CreatedAt', label: 'Fecha de creación' },
]

const col = createColumnHelper<PartnerRow>()

export function PartnersPage({
  config,
  search,
  setSearch,
}: {
  config: RoleConfig
  search: PartnerSearch
  setSearch: (update: (prev: PartnerSearch) => PartnerSearch, options?: { replace?: boolean }) => void
}) {
  const isSuppliers = config.role === 'proveedores'
  const list = useQuery(partnerListQuery(partnerListParams(config.role, search)))
  const docTypes = useQuery(identityDocumentTypesQuery)
  // Cada lista ofrece solo los documentos que su rol puede tener (lo indica la API): en Proveedores no hay DNI y,
  // mientras solo se venda en Perú, en Clientes no hay documento extranjero.
  const docOptions = useMemo(
    () =>
      (docTypes.data ?? [])
        .filter((d) => (isSuppliers ? d.canBeSupplier : d.canBeClient))
        .map((d) => ({ value: d.identityDocumentType, label: d.description })),
    [docTypes.data, isSuppliers],
  )
  const hasFilters = !!(search.q || search.estado || search.doc)
  const statusOptions: Option<BlockFilter>[] = [
    { value: 'activos', label: 'Activos' },
    { value: 'bloqueados', label: config.blockedFilterLabel },
  ]
  const addRole = useAddPartnerRole()
  // "Registrar también como…": el mismo registro pasa a la otra lista (la API dice si se puede: canAdd…Role).
  const addOtherRole = (p: PartnerRow) =>
    addRole.mutate(
      { id: p.id, role: isSuppliers ? 'Client' : 'Supplier' },
      {
        onSuccess: () => toast.ok(`${p.name} ahora también es ${isSuppliers ? 'cliente' : 'proveedor'}`),
        onError: (e) => toast.error(errorMessages(e)[0]),
      },
    )
  const [editing, setEditing] = useState<PartnerRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => setSearch((prev) => ({ ...prev, nuevo: true }))
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) setSearch((prev) => ({ ...prev, nuevo: undefined }), { replace: true })
  }
  useHotkey('n', openNew)

  // Bloquear pregunta antes y pide un motivo opcional; desbloquear no, porque no quita nada.
  const [blocking, setBlocking] = useState<PartnerRow | null>(null)
  const unblock = useBlockPartnerRole()
  const onUnblock = (p: PartnerRow) =>
    unblock.mutate(
      { id: p.id, role: config.apiRole, blocked: false },
      {
        onSuccess: () => toast.ok(`${isSuppliers ? 'Compras' : 'Ventas'} desbloqueadas: ${p.name}`),
        onError: (e) => toast.error(errorMessages(e)[0]),
      },
    )
  const busyId = unblock.isPending ? unblock.variables?.id : addRole.isPending ? addRole.variables?.id : undefined
  const clearFilters = () => setSearch(() => ({}))

  const columns = useMemo(
    () => [
      col.accessor('documentNumber', {
        header: 'Documento',
        cell: (c) => (
          <span>
            <span className="block font-mono text-sm whitespace-nowrap">{c.getValue()}</span>
            <span className="block text-xs text-faint">{c.row.original.identityDocumentTypeDescription}</span>
          </span>
        ),
      }),
      col.accessor('name', {
        header: 'Nombre o razón social',
        // Si también tiene el otro rol se indica debajo: es el mismo registro en las dos listas.
        cell: (c) => (
          <span>
            {c.getValue()}
            {c.row.original.isClient && c.row.original.isSupplier && <span className="block text-xs text-faint">{config.alsoOther}</span>}
          </span>
        ),
      }),
      col.accessor('countryName', { header: 'País', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.display({
        id: 'status',
        header: 'Estado',
        // El estado es el del rol de esta lista; si está bloqueado, el motivo va debajo.
        cell: (c) => {
          const p = c.row.original
          if (!config.isBlocked(p)) return <Pill tone="ok">{config.status(p)}</Pill>
          const reason = config.blockReason(p)
          return (
            <span className="flex flex-col items-start gap-1">
              <Pill tone="bad">{config.status(p)}</Pill>
              {reason && <span className="text-xs text-muted">{reason}</span>}
            </span>
          )
        },
      }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => {
          const p = c.row.original
          return (
            <RowMenu
              label={p.name}
              busy={busyId === p.id}
              items={[
                { label: 'Editar', icon: <Pencil />, onSelect: () => setEditing(p) },
                ...((isSuppliers ? p.canAddClientRole : p.canAddSupplierRole)
                  ? [{ label: `Registrar también como ${isSuppliers ? 'cliente' : 'proveedor'}`, icon: <UserPlus />, onSelect: () => addOtherRole(p) }]
                  : []),
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => setHistory({ entityType: 'BusinessPartner', entityId: p.id, label: `${p.documentNumber} · ${p.name}` }) },
                config.isBlocked(p)
                  ? { label: config.unblockLabel, icon: <LockOpen />, onSelect: () => onUnblock(p) }
                  : { label: config.blockLabel, icon: <Ban />, onSelect: () => setBlocking(p), danger: true },
              ]}
            />
          )
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, config, isSuppliers],
  )

  const data = list.data

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button variant="primary" onClick={openNew} title="Atajo: N">
            <Plus />
            {config.newLabel}
          </Button>
        }
      />

      <ListPanel>
        <ViewTabs screen={config.screen} search={search} onApply={(s) => setSearch(() => s as PartnerSearch)} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={
            <SearchBox
              value={search.q}
              onSearch={(q) => setSearch((prev) => ({ ...prev, q, page: undefined }), { replace: true })}
              placeholder={config.searchPlaceholder}
              hint="Por número de documento o nombre"
            />
          }
          filters={[
            {
              kind: 'select',
              key: 'doc',
              label: 'Documento',
              options: docOptions,
              value: search.doc,
              onChange: (doc) => setSearch((prev) => ({ ...prev, doc: doc as PartnerSearch['doc'], page: undefined })),
            },
            {
              kind: 'select',
              key: 'estado',
              label: 'Estado',
              options: statusOptions,
              value: search.estado,
              onChange: (estado) => setSearch((prev) => ({ ...prev, estado: estado as PartnerSearch['estado'], page: undefined })),
            },
          ]}
          onClear={isCustomized(search) ? clearFilters : undefined}
          sort={
            // El orden que se muestra es el que aplicó la API (el suyo por defecto si no se eligió ninguno).
            data && (
              <SortMenu
                options={sortOptions}
                value={data.sortBy}
                descending={data.sortDescending}
                onChange={(orden, desc) => setSearch((prev) => ({ ...prev, orden, dir: desc ? 'desc' : 'asc', page: undefined }))}
              />
            )
          }
        />

        {list.isError ? (
          <ErrorList messages={errorMessages(list.error)} />
        ) : !data ? (
          <Loading text={config.loading} />
        ) : data.items.length > 0 ? (
          <DataTable data={data.items} columns={columns} getRowId={(r) => r.id} onOpen={setEditing} isMuted={config.isBlocked} />
        ) : hasFilters ? (
          <EmptyState icon={config.icon} text="Nadie coincide con la búsqueda o los filtros." action={<Button onClick={clearFilters}>Limpiar filtros</Button>} />
        ) : (
          <EmptyState
            icon={config.icon}
            title={config.emptyTitle}
            text={config.emptyText}
            action={
              <Button variant="primary" onClick={openNew}>
                <Plus />
                {config.newLabel}
              </Button>
            }
          />
        )}

        <Pagination
          info={data}
          onPage={(p) => setSearch((prev) => ({ ...prev, page: p === 1 ? undefined : p }))}
          onPageSize={(filas) => setSearch((prev) => ({ ...prev, filas, page: undefined }))}
        />
      </ListPanel>

      <PartnerFormDialog open={!!search.nuevo || editing !== null} partner={editing} role={config.role} onClose={closeForm} />
      {blocking && <BlockRoleDialog partner={blocking} role={config.apiRole} onClose={() => setBlocking(null)} />}
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
