import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'
import { z } from 'zod'
import { companiesQuery } from '@/api/companies'
import { purchaseListQuery, type PurchaseRow, type PurchaseSortBy } from '@/api/purchases'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { FilterBar, SortMenu, type Option } from '@/components/ui/filters'
import { ListBody, Pagination, SearchBox, ListPanel } from '@/components/ui/list-controls'
import { PageHeader, Pill } from '@/components/ui/misc'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { directionSchema, pageSchema, pageSizeSchema, nextSort, shownSort, sortSearch } from '@/lib/filters'
import { formatDate, formatMoney } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'

const sortOptions: Option<PurchaseSortBy>[] = [
  { value: 'IssueDate', label: 'Fecha de emisión' },
  { value: 'SupplierName', label: 'Proveedor' },
  { value: 'Total', label: 'Total' },
  { value: 'Document', label: 'Comprobante' },
  { value: 'CompanyName', label: 'Empresa' },
  { value: 'CreatedAt', label: 'Fecha de registro' },
]

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  empresa: z.string().optional().catch(undefined),
  orden: z.enum(['IssueDate', 'SupplierName', 'Total', 'CreatedAt', 'Document', 'CompanyName']).optional().catch(undefined),
  dir: directionSchema,
})
type Search = z.infer<typeof searchSchema>

// Sin orden en la URL, la API usa el suyo por defecto.
const listParams = (s: Search) => ({
  q: s.q,
  page: s.page ?? 1,
  pageSize: s.filas,
  companyId: s.empresa,
  sortBy: s.orden,
  descending: s.orden ? s.dir === 'desc' : undefined,
})

export const Route = createFileRoute('/_app/compras/')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('Purchases'),
  loaderDeps: ({ search }) => listParams(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(companiesQuery)
    return context.queryClient.ensureQueryData(purchaseListQuery(deps))
  },
  component: PurchasesPage,
})

const col = createColumnHelper<PurchaseRow>()

function PurchasesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const go = useNavigate()
  const list = useQuery(purchaseListQuery(listParams(search)))
  const companies = useQuery(companiesQuery)
  const companyOptions = useMemo(() => (companies.data ?? []).map((c) => ({ value: c.id, label: c.name })), [companies.data])
  const hasFilters = !!(search.q || search.empresa)

  const openNew = () => go({ to: '/compras/nueva' })
  const open = (p: PurchaseRow) => go({ to: '/compras/$id', params: { id: p.id } })
  useHotkey('n', openNew)

  const columns = useMemo(
    () => [
      col.accessor('issueDate', { header: 'Fecha', meta: { sortBy: 'IssueDate', sortDescendingFirst: true }, cell: (c) => <span className="num whitespace-nowrap text-muted">{formatDate(c.getValue())}</span> }),
      col.accessor('fullNumber', {
        header: 'Comprobante',
        meta: { sortBy: 'Document' },
        cell: (c) => (
          <span className="whitespace-nowrap">
            <span className="text-xs text-faint">{c.row.original.taxDocumentTypeDescription} </span>
            <span className="font-mono text-xs">{c.getValue()}</span>
          </span>
        ),
      }),
      col.accessor('supplierName', {
        header: 'Proveedor',
        meta: { sortBy: 'SupplierName' },
        cell: (c) => (
          <span>
            {c.getValue()}
            <span className="block font-mono text-xs text-faint">{c.row.original.supplierDocumentNumber}</span>
          </span>
        ),
      }),
      col.accessor('companyName', { header: 'Empresa', meta: { hideOnMobile: true, sortBy: 'CompanyName' }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('total', {
        header: 'Total',
        meta: { alignRight: true, sortBy: 'Total', sortDescendingFirst: true },
        cell: (c) => <span className="num whitespace-nowrap">{formatMoney(c.getValue(), c.row.original.currencySymbol)}</span>,
      }),
      col.accessor('isCancelled', { header: 'Estado', cell: (c) => <Pill tone={c.getValue() ? 'bad' : 'ok'}>{c.row.original.statusDescription}</Pill> }),
    ],
    [],
  )

  const data = list.data
  const sort = shownSort(search.orden, search.dir, data)
  // Ordenar con el menú o con un clic en el título de una columna: el orden va a la URL y lo aplica la API.
  const changeSort = (orden: string, desc: boolean) =>
    navigate({ search: (prev) => ({ ...prev, ...sortSearch(orden as NonNullable<Search['orden']>, desc, data), page: undefined }) })
  // Clic en el título de una columna: invierte si ya ordena por ella (calculado sobre la última URL pedida).
  const sortByColumn = (by: string, descendingFirst: boolean) =>
    navigate({ search: (prev) => ({ ...prev, ...nextSort(prev, by as NonNullable<Search['orden']>, descendingFirst, data), page: undefined }) })

  return (
    <>
      <PageHeader
        title="Compras"
        description="Facturas y boletas de tus proveedores. Al registrarlas, la mercadería entra al stock de la empresa."
        actions={
          <Button variant="primary" onClick={openNew} title="Atajo: N">
            <Plus />
            Nueva compra
          </Button>
        }
      />

      <ListPanel>
        <ViewTabs screen="Purchases" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q, page: undefined }), replace: true })} placeholder="Buscar compras" hint="Por serie y número del comprobante o por proveedor" />}
          filters={[
            {
              kind: 'select',
              key: 'empresa',
              label: 'Empresa',
              options: companyOptions,
              value: search.empresa,
              onChange: (empresa) => navigate({ search: (prev) => ({ ...prev, empresa, page: undefined }) }),
            },
          ]}
          onClear={isCustomized(search) ? () => navigate({ search: {} }) : undefined}
          sort={
            // El orden que se muestra es el que aplicó la API (el suyo por defecto si no se eligió ninguno).
            sort && (
              <SortMenu
                options={sortOptions}
                value={sort.by}
                descending={sort.descending}
                onChange={changeSort}
              />
            )
          }
        />

        <ListBody
          query={list}
          rows={data?.items}
          loading="Cargando compras…"
          icon={<ShoppingCart strokeWidth={1.5} />}
          filtered={hasFilters}
          noMatch="Ninguna compra coincide con la búsqueda o el filtro."
          empty={{
            title: 'Todavía no hay compras',
            text: 'Registra la factura de un proveedor y la mercadería entrará al stock.',
            action: (
              <Button variant="primary" onClick={openNew}>
                <Plus />
                Registrar compra
              </Button>
            ),
          }}
        >
          {(rows) => (
            <DataTable
              data={rows}
              columns={columns}
              getRowId={(r) => r.id}
              onOpen={open}
              isMuted={(r) => r.isCancelled}
              sort={sort && { ...sort, onSort: sortByColumn }}
            />
          )}
        </ListBody>

        <Pagination
          info={data}
          onPage={(p) => navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })}
          onPageSize={(filas) => navigate({ search: (prev) => ({ ...prev, filas, page: undefined }) })}
        />
      </ListPanel>
    </>
  )
}
