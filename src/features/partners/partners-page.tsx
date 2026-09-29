import { useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, Pencil, Plus, Power, Truck, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { partnerListQuery, useTogglePartner, type PartnerRole, type PartnerRow, type PartnerSortBy } from '@/api/partners'
import type { SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { DataTable, RowMenu } from '@/components/ui/data-table'
import { FilterBar, SortMenu, type Option } from '@/components/ui/filters'
import { EmptyState, ListPanel, Loading, Pagination, SearchBox } from '@/components/ui/list-controls'
import { ErrorList, PageHeader, Pill } from '@/components/ui/misc'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { PartnerFormDialog } from '@/features/partners/partner-form-dialog'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { isCustomized } from '@/features/saved-views/view-filters'
import { useConfirmToggle } from '@/features/shared/use-confirm-toggle'
import { directionSchema, pageSchema, pageSizeSchema, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

export const partnerSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  estado: statusSchema,
  doc: z.enum(['Ruc', 'Dni', 'TributarioExtranjero']).optional().catch(undefined),
  orden: z.enum(['Name', 'CreatedAt']).optional().catch(undefined),
  dir: directionSchema,
  nuevo: z.boolean().optional().catch(undefined),
})
export type PartnerSearch = z.infer<typeof partnerSearchSchema>

/**
 * Clientes y proveedores son el mismo registro (una empresa puede ser ambos), pero se muestran en dos listas:
 * Clientes en Comercial y Proveedores en Abastecimiento. Cada lista filtra por su rol.
 */
interface RoleConfig {
  role: PartnerRole
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
}

export const partnerRoles: Record<'clients' | 'suppliers', RoleConfig> = {
  clients: {
    role: 'clientes',
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
  },
  suppliers: {
    role: 'proveedores',
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
  // En Proveedores no se ofrece un documento que un proveedor no puede tener (DNI): lo indica la API.
  const docOptions = useMemo(
    () =>
      (docTypes.data ?? [])
        .filter((d) => !isSuppliers || d.canBeSupplier)
        .map((d) => ({ value: d.identityDocumentType, label: d.description })),
    [docTypes.data, isSuppliers],
  )
  const hasFilters = !!(search.q || search.estado || search.doc)
  const toggle = useTogglePartner()
  const [editing, setEditing] = useState<PartnerRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => setSearch((prev) => ({ ...prev, nuevo: true }))
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) setSearch((prev) => ({ ...prev, nuevo: undefined }), { replace: true })
  }
  useHotkey('n', openNew)

  const activation = useConfirmToggle<PartnerRow>(toggle, {
    title: isSuppliers ? '¿Desactivar este proveedor?' : '¿Desactivar este cliente?',
    body: (p) => (
      <>
        <strong className="font-medium text-ink">{p.name}</strong> dejará de aparecer al registrar {isSuppliers ? 'compras' : 'ventas'}
        {p.isClient && p.isSupplier ? ` y también como ${isSuppliers ? 'cliente' : 'proveedor'}` : ''}. Su historial se conserva y puedes activarlo de nuevo
        cuando quieras.
      </>
    ),
    done: (p, active) => `${p.name} ${active ? 'activado' : 'desactivado'}`,
  })
  const { request: onToggle, busyId } = activation
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
      col.accessor('isActive', { header: 'Estado', cell: (c) => (c.getValue() ? <Pill tone="ok">Activo</Pill> : <Pill tone="neutral">Inactivo</Pill>) }),
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
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => setHistory({ entityType: 'BusinessPartner', entityId: p.id, label: `${p.documentNumber} · ${p.name}` }) },
                p.isActive
                  ? { label: 'Desactivar', icon: <Power />, onSelect: () => onToggle(p), danger: true }
                  : { label: 'Activar', icon: <Power />, onSelect: () => onToggle(p) },
              ]}
            />
          )
        },
      }),
    ],
    [onToggle, busyId, config.alsoOther],
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
          <DataTable data={data.items} columns={columns} getRowId={(r) => r.id} onOpen={setEditing} isMuted={(r) => !r.isActive} />
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
      {activation.dialog}
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
