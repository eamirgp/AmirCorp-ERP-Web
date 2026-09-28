import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Building2, HistoryIcon, Pencil, Plus, Power } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { errorMessages } from '@/api/client'
import { companiesQuery, useToggleCompany, type CompanyRow } from '@/api/companies'
import { Button } from '@/components/ui/button'
import { DataTable, RowActions } from '@/components/ui/data-table'
import { FilterBar, FilterChip } from '@/components/ui/filters'
import { EmptyState, Loading, SearchBox } from '@/components/ui/list-controls'
import { ErrorList, PageHeader, Pill } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { CompanyFormDialog } from '@/features/companies/company-form-dialog'
import { countLabel, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: statusSchema,
  nuevo: z.boolean().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/empresas')({
  validateSearch: (search) => searchSchema.parse(search),
  loader: ({ context }) => context.queryClient.ensureQueryData(companiesQuery),
  component: CompaniesPage,
})

const col = createColumnHelper<CompanyRow>()

function CompaniesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(companiesQuery)
  const toggle = useToggleCompany()
  const [editing, setEditing] = useState<CompanyRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const onToggle = useCallback(
    (c: CompanyRow) =>
      toggle.mutate(
        { id: c.id, active: !c.isActive },
        { onSuccess: () => toast.ok(`${c.name} ${c.isActive ? 'desactivada' : 'activada'}`), onError: (e) => toast.error(errorMessages(e)[0]) },
      ),
    [toggle],
  )

  // La API devuelve todas las empresas (son pocas): buscar y filtrar aquí es solo presentación.
  const rows = useMemo(() => {
    const q = search.q?.toLowerCase()
    return (list.data ?? []).filter(
      (c) => (!search.estado || c.isActive === (search.estado === 'activos')) && (!q || c.name.toLowerCase().includes(q) || c.ruc.includes(q)),
    )
  }, [list.data, search.q, search.estado])

  const columns = useMemo(
    () => [
      col.accessor('ruc', { header: 'RUC', cell: (c) => <span className="font-mono text-xs text-muted">{c.getValue()}</span> }),
      col.accessor('name', { header: 'Razón social' }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => (c.getValue() ? <Pill tone="ok">Activa</Pill> : <Pill tone="neutral">Inactiva</Pill>) }),
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
              onClick={() => setHistory({ entityType: 'Company', entityId: c.row.original.id, label: `${c.row.original.ruc} · ${c.row.original.name}` })}
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

      <section className="flex flex-col">
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q }), replace: true })} placeholder="Buscar por RUC o razón social" />}
          filters={<FilterChip label="Estado" options={statusOptions} value={search.estado} onChange={(estado) => navigate({ search: (prev) => ({ ...prev, estado }) })} />}
          onClear={search.q || search.estado ? () => navigate({ search: (prev) => ({ ...prev, q: undefined, estado: undefined }) }) : undefined}
          count={list.data ? countLabel(rows.length, 'empresa', 'empresas') : undefined}
        />

        {list.isError ? (
          <ErrorList messages={errorMessages(list.error)} />
        ) : !list.data ? (
          <Loading text="Cargando empresas…" />
        ) : rows.length > 0 ? (
          <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={setEditing} isMuted={(r) => !r.isActive} />
        ) : list.data.length > 0 ? (
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
      </section>

      <CompanyFormDialog open={!!search.nuevo || editing !== null} company={editing} onClose={closeForm} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
