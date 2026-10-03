import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { auditListQuery, type AuditAction, type AuditEntityType, type AuditEntry } from '@/api/audit'
import { auditActionsQuery, auditEntityTypesQuery } from '@/api/catalogs'
import { usersQuery } from '@/api/users'
import { Button } from '@/components/ui/button'
import { DataTable, RowActions } from '@/components/ui/data-table'
import { FilterBar } from '@/components/ui/filters'
import { EmptyState, Loading, Pagination, SearchBox, ListPanel, ListError } from '@/components/ui/list-controls'
import { PageHeader } from '@/components/ui/misc'
import { ChangeList } from '@/features/audit/change-list'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { pageSchema, pageSizeSchema } from '@/lib/filters'
import { formatDateTime } from '@/lib/format'

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

// Módulo y acción se validan en la API: las opciones válidas llegan de /api/audit/entity-types y /actions.
const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  modulo: z.string().optional().catch(undefined),
  accion: z.string().optional().catch(undefined),
  usuario: z.string().optional().catch(undefined),
  desde: daySchema,
  hasta: daySchema,
})
type Search = z.infer<typeof searchSchema>

const listParams = (s: Search) => ({
  q: s.q,
  page: s.page ?? 1,
  pageSize: s.filas,
  entityType: s.modulo as AuditEntityType | undefined,
  action: s.accion as AuditAction | undefined,
  userId: s.usuario,
  from: s.desde,
  to: s.hasta,
})

export const Route = createFileRoute('/_app/auditoria')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('Audit'),
  loaderDeps: ({ search }) => listParams(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(auditEntityTypesQuery)
    void context.queryClient.prefetchQuery(auditActionsQuery)
    void context.queryClient.prefetchQuery(usersQuery)
    return context.queryClient.ensureQueryData(auditListQuery(deps))
  },
  component: AuditPage,
})

const col = createColumnHelper<AuditEntry>()

function AuditPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(auditListQuery(listParams(search)))
  const entityTypes = useQuery(auditEntityTypesQuery)
  const actions = useQuery(auditActionsQuery)
  const users = useQuery(usersQuery)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const moduleOptions = useMemo(() => (entityTypes.data ?? []).map((t) => ({ value: t.entityType as string, label: t.description })), [entityTypes.data])
  const actionOptions = useMemo(() => (actions.data ?? []).map((a) => ({ value: a.action as string, label: a.description })), [actions.data])
  const userOptions = useMemo(() => (users.data ?? []).map((u) => ({ value: u.id, label: u.name })), [users.data])

  const hasFilters = !!(search.q || search.modulo || search.accion || search.usuario || search.desde || search.hasta)
  const filter = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  const openHistory = useCallback((e: AuditEntry) => setHistory({ entityType: e.entityType, entityId: e.entityId, label: e.entityLabel }), [])

  const columns = useMemo(
    () => [
      col.accessor('occurredAt', { header: 'Fecha y hora', cell: (c) => <span className="num whitespace-nowrap text-muted">{formatDateTime(c.getValue())}</span> }),
      col.accessor('userName', { header: 'Usuario' }),
      col.accessor('entityLabel', {
        header: 'Registro',
        cell: (c) => (
          <span>
            {c.getValue()}
            <span className="block text-xs text-faint">{c.row.original.entityTypeDescription}</span>
          </span>
        ),
      }),
      col.accessor('actionDescription', { header: 'Acción', cell: (c) => <span className="whitespace-nowrap">{c.getValue()}</span> }),
      col.accessor('changes', { header: 'Detalle', meta: { hideOnMobile: true }, cell: (c) => <ChangeList changes={c.getValue()} limit={3} /> }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => (
          <RowActions>
            <Button size="sm" variant="ghost" onClick={() => openHistory(c.row.original)} aria-label={`Historial de ${c.row.original.entityLabel}`} title="Historial del registro">
              <HistoryIcon />
            </Button>
          </RowActions>
        ),
      }),
    ],
    [openHistory],
  )

  const data = list.data

  return (
    <>
      <PageHeader title="Auditoría" description="Quién creó, modificó, activó o anuló cada registro, y cuándo. Solo se puede consultar: nadie puede cambiar el historial." />

      <ListPanel>
        <ViewTabs screen="Audit" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q, page: undefined }), replace: true })} placeholder="Buscar en el historial" hint="Por código o nombre del registro" />}
          filters={[
            { kind: 'select', key: 'modulo', label: 'Módulo', options: moduleOptions, value: search.modulo, onChange: (modulo) => filter({ modulo }) },
            { kind: 'select', key: 'accion', label: 'Acción', options: actionOptions, value: search.accion, onChange: (accion) => filter({ accion }) },
            { kind: 'select', key: 'usuario', label: 'Usuario', options: userOptions, value: search.usuario, onChange: (usuario) => filter({ usuario }) },
            { kind: 'date', key: 'desde', label: 'Desde', value: search.desde, onChange: (desde) => filter({ desde }) },
            { kind: 'date', key: 'hasta', label: 'Hasta', value: search.hasta, onChange: (hasta) => filter({ hasta }) },
          ]}
          onClear={isCustomized(search) ? () => navigate({ search: {} }) : undefined}
        />

        {list.isError ? (
          <ListError error={list.error} onRetry={() => void list.refetch()} />
        ) : !data ? (
          <Loading text="Cargando historial…" />
        ) : data.items.length > 0 ? (
          <DataTable data={data.items} columns={columns} getRowId={(r) => r.id} onOpen={openHistory} />
        ) : hasFilters ? (
          <EmptyState icon={<HistoryIcon strokeWidth={1.5} />} text="Ningún evento coincide con la búsqueda o los filtros." action={<Button onClick={() => navigate({ search: {} })}>Limpiar filtros</Button>} />
        ) : (
          <EmptyState
            icon={<HistoryIcon strokeWidth={1.5} />}
            title="Todavía no hay eventos"
            text="Aquí aparecerá cada creación, modificación, activación o anulación, con quién la hizo y cuándo."
          />
        )}

        <Pagination
          info={data}
          onPage={(p) => navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })}
          onPageSize={(filas) => navigate({ search: (prev) => ({ ...prev, filas, page: undefined }) })}
        />
      </ListPanel>

      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
