import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, Pencil, Power, Ruler } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { unitsListQuery, useToggleUnit, type UnitRow } from '@/api/units'
import { DataTable, RowMenu } from '@/components/ui/data-table'
import { FilterBar, type Option } from '@/components/ui/filters'
import { ListBody, ListPanel, SearchBox } from '@/components/ui/list-controls'
import { PageHeader, Pill } from '@/components/ui/misc'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { useConfirmToggle } from '@/features/shared/use-confirm-toggle'
import { UnitNameDialog } from '@/features/units/unit-name-dialog'
import { isCustomized } from '@/features/saved-views/view-filters'
import { countLabel, listFilterOf, statusSchema, type ActiveFilter } from '@/lib/filters'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: statusSchema,
})
type Search = z.infer<typeof searchSchema>

// "Unidad de medida" es femenino: activas / inactivas.
const statusOptions: Option<ActiveFilter>[] = [
  { value: 'activos', label: 'Activas' },
  { value: 'inactivos', label: 'Inactivas' },
]

export const Route = createFileRoute('/_app/unidades-medida')({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => listFilterOf(search),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(unitsListQuery(deps)),
  component: UnitsPage,
})

const col = createColumnHelper<UnitRow>()

function UnitsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(unitsListQuery(listFilterOf(search)))
  const toggle = useToggleUnit()
  const [editing, setEditing] = useState<UnitRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const activation = useConfirmToggle<UnitRow>(toggle, {
    title: '¿Desactivar esta unidad?',
    body: (u) => (
      <>
        <strong className="font-medium text-ink">{u.name}</strong> ({u.code}) dejará de aparecer en productos, compras y la planilla de Excel. Puedes activarla
        de nuevo cuando quieras.
      </>
    ),
    done: (u, active) => `${u.name} ${active ? 'activada' : 'desactivada'}`,
  })
  const { request: onToggle, busyId } = activation

  const rows = list.data ?? []

  const columns = useMemo(
    () => [
      col.accessor('code', { header: 'Código SUNAT', cell: (c) => <span className="font-mono text-xs text-muted">{c.getValue()}</span> }),
      col.accessor('name', {
        header: 'Nombre',
        cell: (c) => (
          <span>
            {c.getValue()}
            <span className="block text-xs text-faint">{c.row.original.sunatName}</span>
          </span>
        ),
      }),
      col.accessor('conversionDescription', { header: 'Trae', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('productCountDescription', { header: 'Productos', meta: { hideOnMobile: true }, cell: (c) => <span className="num text-muted">{c.getValue()}</span> }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => <Pill tone={c.getValue() ? 'ok' : 'neutral'}>{c.row.original.statusDescription}</Pill> }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => {
          const u = c.row.original
          return (
            <RowMenu
              label={u.name}
              busy={busyId === u.id}
              items={[
                { label: 'Cambiar nombre', icon: <Pencil />, onSelect: () => setEditing(u) },
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => setHistory({ entityType: 'UnitOfMeasure', entityId: u.id, label: `${u.code} · ${u.name}` }) },
                u.isActive
                  ? { label: 'Desactivar', icon: <Power />, onSelect: () => onToggle(u), danger: true }
                  : { label: 'Activar', icon: <Power />, onSelect: () => onToggle(u) },
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
        title="Unidades de medida"
        description="El catálogo de SUNAT. Activa las que usa tu empresa: solo esas aparecen en productos, compras y la planilla de Excel."
      />

      <ListPanel>
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={
            <SearchBox
              value={search.q}
              onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q }), replace: true })}
              placeholder="Buscar unidades"
              hint="Por nombre o código SUNAT"
            />
          }
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
          count={list.data ? countLabel(rows.length, 'unidad', 'unidades') : undefined}
        />

        <ListBody
          query={list}
          rows={list.data}
          loading="Cargando unidades…"
          icon={<Ruler strokeWidth={1.5} />}
          noMatch="Ninguna unidad coincide con la búsqueda o el filtro."
          onClear={() => navigate({ search: {} })}
        >
          {(items) => <DataTable data={items} columns={columns} getRowId={(r) => r.id} onOpen={setEditing} isMuted={(r) => !r.isActive} />}
        </ListBody>
      </ListPanel>

      <UnitNameDialog unit={editing} onClose={() => setEditing(null)} />
      {activation.dialog}
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
