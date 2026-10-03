import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Building2, HistoryIcon, Pencil, Plus, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { errorMessages } from '@/api/client'
import { companiesListQuery, useToggleCompany, type CompanyRow } from '@/api/companies'
import { Button } from '@/components/ui/button'
import { DataTable, RowMenu } from '@/components/ui/data-table'
import { FilterBar } from '@/components/ui/filters'
import { EmptyState, Loading, SearchBox, ListPanel } from '@/components/ui/list-controls'
import { ErrorList, PageHeader, Pill } from '@/components/ui/misc'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { CompanyFormDialog } from '@/features/companies/company-form-dialog'
import { useConfirmToggle } from '@/features/shared/use-confirm-toggle'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { countLabel, listFilterOf, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: statusSchema,
  nuevo: z.boolean().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/empresas')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('Companies'),
  loaderDeps: ({ search }) => listFilterOf(search),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(companiesListQuery(deps)),
  component: CompaniesPage,
})

const col = createColumnHelper<CompanyRow>()

function CompaniesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(companiesListQuery(listFilterOf(search)))
  const toggle = useToggleCompany()
  const [editing, setEditing] = useState<CompanyRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const activation = useConfirmToggle<CompanyRow>(toggle, {
    title: '¿Desactivar esta empresa?',
    body: (c) => (
      <>
        <strong className="font-medium text-ink">{c.name}</strong> (RUC {c.ruc}) ya no podrá usarse en compras ni ventas nuevas. Sus registros se conservan y
        puedes activarla de nuevo cuando quieras.
      </>
    ),
    done: (c, active) => `${c.name} ${active ? 'activada' : 'desactivada'}`,
  })
  const { request: onToggle, busyId } = activation

  const rows = list.data ?? []
  const filtered = !!search.q || !!search.estado

  const columns = useMemo(
    () => [
      col.accessor('ruc', { header: 'RUC', cell: (c) => <span className="font-mono text-xs text-muted">{c.getValue()}</span> }),
      col.accessor('name', { header: 'Razón social' }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => <Pill tone={c.getValue() ? 'ok' : 'neutral'}>{c.row.original.statusDescription}</Pill> }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => {
          const co = c.row.original
          return (
            <RowMenu
              label={co.name}
              busy={busyId === co.id}
              items={[
                { label: 'Editar', icon: <Pencil />, onSelect: () => setEditing(co) },
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => setHistory({ entityType: 'Company', entityId: co.id, label: `${co.ruc} · ${co.name}` }) },
                co.isActive
                  ? { label: 'Desactivar', icon: <Power />, onSelect: () => onToggle(co), danger: true }
                  : { label: 'Activar', icon: <Power />, onSelect: () => onToggle(co) },
              ]}
            />
          )
        },
      }),
    ],
    [onToggle, busyId],
  )

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Cada empresa (RUC) lleva sus propias compras, stock y ventas."
        actions={
          <Button variant="primary" onClick={openNew} title="Atajo: N">
            <Plus />
            Nueva empresa
          </Button>
        }
      />

      <ListPanel>
        <ViewTabs screen="Companies" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q }), replace: true })} placeholder="Buscar empresas" hint="Por RUC o razón social" />}
          filters={[
            {
              kind: 'select',
              key: 'estado',
              label: 'Estado',
              options: statusOptions,
              value: search.estado,
              onChange: (estado) => navigate({ search: (prev) => ({ ...prev, estado: estado as Search['estado'] }) }),
            },
          ]}
          onClear={isCustomized(search) ? () => navigate({ search: {} }) : undefined}
          count={list.data ? countLabel(rows.length, 'empresa', 'empresas') : undefined}
        />

        {list.isError ? (
          <ErrorList messages={errorMessages(list.error)} />
        ) : !list.data ? (
          <Loading text="Cargando empresas…" />
        ) : rows.length > 0 ? (
          <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={setEditing} isMuted={(r) => !r.isActive} />
        ) : filtered ? (
          <EmptyState icon={<Building2 strokeWidth={1.5} />} text="Ninguna empresa coincide con la búsqueda o el filtro." />
        ) : (
          <EmptyState
            icon={<Building2 strokeWidth={1.5} />}
            title="Todavía no hay empresas"
            text="Registra cada RUC con el que compras y vendes."
            action={
              <Button variant="primary" onClick={openNew}>
                <Plus />
                Crear empresa
              </Button>
            }
          />
        )}
      </ListPanel>

      <CompanyFormDialog open={!!search.nuevo || editing !== null} company={editing} onClose={closeForm} />
      {activation.dialog}
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
