import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { identityDocumentTypesQuery } from '@/api/catalogs'
import { errorText } from '@/api/client'
import { partnerListQuery, useAddPartnerRole, useBlockPartnerRole, type BlockFilter, type PartnerRow, type PartnerSortBy } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { FilterBar, SortMenu, type Option } from '@/components/ui/filters'
import { ListBody, ListPanel, Pagination, SearchBox } from '@/components/ui/list-controls'
import { PageHeader } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { BlockRoleDialog } from '@/features/partners/block-role-dialog'
import { usePartnerColumns } from '@/features/partners/partner-columns'
import { PartnerFormDialog } from '@/features/partners/partner-form-dialog'
import { partnerListParams, type PartnerSearch, type RoleConfig } from '@/features/partners/partner-roles'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { isCustomized } from '@/features/saved-views/view-filters'
import { useHotkey } from '@/lib/hotkeys'

const sortOptions: Option<PartnerSortBy>[] = [
  { value: 'Name', label: 'Nombre' },
  { value: 'DocumentNumber', label: 'Documento' },
  { value: 'CreatedAt', label: 'Fecha de creación' },
]

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
        onError: (e) => toast.error(errorText(e)),
      },
    )
  const [editing, setEditing] = useState<PartnerRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => setSearch((prev) => ({ ...prev, nuevo: true }))
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) setSearch((prev) => ({ ...prev, nuevo: undefined }), { replace: true })
  }
  // Desde "Nuevo…", si el documento ya existe en esta lista, el formulario pasa a editar ese registro.
  const openExisting = (p: PartnerRow) => {
    setEditing(p)
    if (search.nuevo) setSearch((prev) => ({ ...prev, nuevo: undefined }), { replace: true })
  }
  useHotkey('n', openNew)

  // Bloquear pregunta antes y pide un motivo opcional; desbloquear no, porque no quita nada.
  const [blocking, setBlocking] = useState<PartnerRow | null>(null)
  const unblock = useBlockPartnerRole()
  const onUnblock = (p: PartnerRow) =>
    unblock.mutate(
      { id: p.id, role: config.apiRole, blocked: false, rowVersion: p.rowVersion },
      {
        onSuccess: () => toast.ok(`${isSuppliers ? 'Compras' : 'Ventas'} desbloqueadas: ${p.name}`),
        onError: (e) => toast.error(errorText(e)),
      },
    )
  const busyId = unblock.isPending ? unblock.variables?.id : addRole.isPending ? addRole.variables?.id : undefined
  const clearFilters = () => setSearch(() => ({}))

  const columns = usePartnerColumns({
    config,
    busyId,
    onEdit: setEditing,
    onAddOtherRole: addOtherRole,
    onHistory: setHistory,
    onBlock: setBlocking,
    onUnblock,
  })

  const data = list.data
  // Ordenar con el menú o con un clic en el título de una columna: el orden va a la URL y lo aplica la API.
  const changeSort = (orden: string, desc: boolean) =>
    setSearch((prev) => ({ ...prev, orden: orden as PartnerSearch['orden'], dir: desc ? 'desc' : 'asc', page: undefined }))

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
                onChange={changeSort}
              />
            )
          }
        />

        <ListBody
          query={list}
          rows={data?.items}
          loading={config.loading}
          icon={config.icon}
          filtered={hasFilters}
          noMatch="Nadie coincide con la búsqueda o los filtros."
          onClear={clearFilters}
          empty={{
            title: config.emptyTitle,
            text: config.emptyText,
            action: (
              <Button variant="primary" onClick={openNew}>
                <Plus />
                {config.newLabel}
              </Button>
            ),
          }}
        >
          {(rows) => (
            <DataTable
              data={rows}
              columns={columns}
              getRowId={(r) => r.id}
              onOpen={setEditing}
              isMuted={config.isBlocked}
              sort={data && { by: data.sortBy, descending: data.sortDescending, onChange: changeSort }}
            />
          )}
        </ListBody>

        <Pagination
          info={data}
          onPage={(p) => setSearch((prev) => ({ ...prev, page: p === 1 ? undefined : p }))}
          onPageSize={(filas) => setSearch((prev) => ({ ...prev, filas, page: undefined }))}
        />
      </ListPanel>

      <PartnerFormDialog open={!!search.nuevo || editing !== null} partner={editing} role={config.role} onClose={closeForm} onOpenExisting={openExisting} />
      {blocking && <BlockRoleDialog partner={blocking} role={config.apiRole} onClose={() => setBlocking(null)} />}
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
