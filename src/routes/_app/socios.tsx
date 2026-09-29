import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, Pencil, Plus, Power, Users } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { partnerListQuery, useTogglePartner, type PartnerRole, type PartnerRow, type PartnerSortBy } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { DataTable, RowActions } from '@/components/ui/data-table'
import { FilterBar, FilterChip, SortMenu, type Option } from '@/components/ui/filters'
import { EmptyState, Loading, Pagination, SearchBox } from '@/components/ui/list-controls'
import { ErrorList, PageHeader, Pill } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { PartnerFormDialog } from '@/features/partners/partner-form-dialog'
import { SavedViewsMenu } from '@/features/saved-views/saved-views-menu'
import { applyDefaultView } from '@/features/saved-views/view-filters'
import { countLabel, directionSchema, pageSchema, pageSizeSchema, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  estado: statusSchema,
  rol: z.enum(['clientes', 'proveedores']).optional().catch(undefined),
  doc: z.enum(['Ruc', 'Dni', 'TributarioExtranjero']).optional().catch(undefined),
  orden: z.enum(['Name', 'CreatedAt']).optional().catch(undefined),
  dir: directionSchema,
  nuevo: z.boolean().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

const listParams = (s: Search) => ({
  q: s.q,
  page: s.page ?? 1,
  pageSize: s.filas,
  status: s.estado,
  role: s.rol,
  documentType: s.doc,
  sortBy: s.orden,
  descending: s.dir === 'desc',
})

export const Route = createFileRoute('/_app/socios')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('BusinessPartners'),
  loaderDeps: ({ search }) => listParams(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(identityDocumentTypesQuery)
    void context.queryClient.prefetchQuery(countriesQuery)
    return context.queryClient.ensureQueryData(partnerListQuery(deps))
  },
  component: PartnersPage,
})

const roleOptions: Option<PartnerRole>[] = [
  { value: 'clientes', label: 'Clientes' },
  { value: 'proveedores', label: 'Proveedores' },
]

const sortOptions: Option<PartnerSortBy>[] = [
  { value: 'Name', label: 'Nombre' },
  { value: 'CreatedAt', label: 'Fecha de creación' },
]

const col = createColumnHelper<PartnerRow>()

function PartnersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(partnerListQuery(listParams(search)))
  const docTypes = useQuery(identityDocumentTypesQuery)
  const docOptions = useMemo(() => (docTypes.data ?? []).map((d) => ({ value: d.identityDocumentType, label: d.description })), [docTypes.data])
  const hasFilters = !!(search.q || search.estado || search.rol || search.doc)
  const toggle = useTogglePartner()
  const [editing, setEditing] = useState<PartnerRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const onToggle = useCallback(
    (p: PartnerRow) =>
      toggle.mutate(
        { id: p.id, active: !p.isActive },
        { onSuccess: () => toast.ok(`${p.name} ${p.isActive ? 'desactivado' : 'activado'}`), onError: (e) => toast.error(errorMessages(e)[0]) },
      ),
    [toggle],
  )

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
      col.accessor('name', { header: 'Nombre o razón social' }),
      col.accessor('countryName', { header: 'País', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.display({
        id: 'role',
        header: 'Rol',
        meta: { hideOnMobile: true },
        cell: (c) => <span className="text-muted">{[c.row.original.isClient && 'Cliente', c.row.original.isSupplier && 'Proveedor'].filter(Boolean).join(' · ')}</span>,
      }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => (c.getValue() ? <Pill tone="ok">Activo</Pill> : <Pill tone="neutral">Inactivo</Pill>) }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => (
          <RowActions>
            <Button size="sm" variant="ghost" onClick={() => setEditing(c.row.original)}>
              <Pencil />
              <span className="max-md:sr-only">Editar</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(c.row.original)}>
              <Power />
              <span className="max-md:sr-only">{c.row.original.isActive ? 'Desactivar' : 'Activar'}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistory({ entityType: 'BusinessPartner', entityId: c.row.original.id, label: `${c.row.original.documentNumber} · ${c.row.original.name}` })}
              aria-label={`Historial de ${c.row.original.name}`}
              title="Historial"
            >
              <HistoryIcon />
            </Button>
          </RowActions>
        ),
      }),
    ],
    [onToggle],
  )

  const data = list.data

  return (
    <>
      <PageHeader
        title="Clientes y proveedores"
        description="Compartidos por todas tus empresas, incluidos los proveedores del extranjero."
        actions={
          <Button variant="primary" onClick={openNew} title="Atajo: N">
            <Plus />
            Nuevo
          </Button>
        }
      />

      <section className="flex flex-col">
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q, page: undefined }), replace: true })} placeholder="Buscar por documento o nombre" />}
          filters={
            <>
              <FilterChip label="Rol" options={roleOptions} value={search.rol} onChange={(rol) => navigate({ search: (prev) => ({ ...prev, rol, page: undefined }) })} />
              <FilterChip label="Documento" options={docOptions} value={search.doc} onChange={(doc) => navigate({ search: (prev) => ({ ...prev, doc, page: undefined }) })} />
              <FilterChip label="Estado" options={statusOptions} value={search.estado} onChange={(estado) => navigate({ search: (prev) => ({ ...prev, estado, page: undefined }) })} />
            </>
          }
          onClear={hasFilters ? () => navigate({ search: (prev) => ({ ...prev, q: undefined, rol: undefined, doc: undefined, estado: undefined, page: undefined }) }) : undefined}
          count={data ? countLabel(data.totalCount, 'registro', 'registros') : undefined}
          views={<SavedViewsMenu screen="BusinessPartners" search={search} onApply={(s) => navigate({ search: s as Search })} />}
          sort={
            <SortMenu
              options={sortOptions}
              value={search.orden ?? 'Name'}
              descending={search.dir === 'desc'}
              onChange={(orden, desc) => navigate({ search: (prev) => ({ ...prev, orden: orden === 'Name' ? undefined : orden, dir: desc ? 'desc' : undefined, page: undefined }) })}
            />
          }
        />

        {list.isError ? (
          <ErrorList messages={errorMessages(list.error)} />
        ) : !data ? (
          <Loading text="Cargando…" />
        ) : data.items.length > 0 ? (
          <DataTable data={data.items} columns={columns} getRowId={(r) => r.id} onOpen={setEditing} isMuted={(r) => !r.isActive} />
        ) : hasFilters ? (
          <EmptyState icon={<Users strokeWidth={1.5} />} text="Nadie coincide con la búsqueda o los filtros." />
        ) : (
          <EmptyState
            icon={<Users strokeWidth={1.5} />}
            title="Todavía no hay clientes ni proveedores"
            text="Registra a tus proveedores nacionales y del extranjero, y a tus clientes."
            action={
              <Button variant="primary" onClick={openNew}>
                <Plus />
                Crear
              </Button>
            }
          />
        )}

        <Pagination
          info={data}
          onPage={(p) => navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })}
          onPageSize={(filas) => navigate({ search: (prev) => ({ ...prev, filas, page: undefined }) })}
        />
      </section>

      <PartnerFormDialog open={!!search.nuevo || editing !== null} partner={editing} onClose={closeForm} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
