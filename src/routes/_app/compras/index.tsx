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
import { EmptyState, Loading, Pagination, SearchBox, ListPanel, ListError } from '@/components/ui/list-controls'
import { PageHeader, Pill } from '@/components/ui/misc'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { directionSchema, pageSchema, pageSizeSchema } from '@/lib/filters'
import { formatDate, formatMoney } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'

const sortOptions: Option<PurchaseSortBy>[] = [
  { value: 'IssueDate', label: 'Fecha de emisión' },
  { value: 'SupplierName', label: 'Proveedor' },
  { value: 'Total', label: 'Total' },
  { value: 'CreatedAt', label: 'Fecha de registro' },
]

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  empresa: z.string().optional().catch(undefined),
  orden: z.enum(['IssueDate', 'SupplierName', 'Total', 'CreatedAt']).optional().catch(undefined),
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
      col.accessor('issueDate', { header: 'Fecha', cell: (c) => <span className="num whitespace-nowrap text-muted">{formatDate(c.getValue())}</span> }),
      col.accessor('fullNumber', {
        header: 'Comprobante',
        cell: (c) => (
          <span className="whitespace-nowrap">
            <span className="text-xs text-faint">{c.row.original.taxDocumentTypeDescription} </span>
            <span className="font-mono text-xs">{c.getValue()}</span>
          </span>
        ),
      }),
      col.accessor('supplierName', {
        header: 'Proveedor',
        cell: (c) => (
          <span>
            {c.getValue()}
            <span className="block font-mono text-xs text-faint">{c.row.original.supplierDocumentNumber}</span>
          </span>
        ),
      }),
      col.accessor('companyName', { header: 'Empresa', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('total', {
        header: () => <span className="block text-right">Total</span>,
        cell: (c) => <span className="num block text-right whitespace-nowrap">{formatMoney(c.getValue(), c.row.original.currencySymbol)}</span>,
      }),
      col.accessor('isCancelled', { header: 'Estado', cell: (c) => <Pill tone={c.getValue() ? 'bad' : 'ok'}>{c.row.original.statusDescription}</Pill> }),
    ],
    [],
  )

  const data = list.data

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
            data && (
              <SortMenu
                options={sortOptions}
                value={data.sortBy}
                descending={data.sortDescending}
                onChange={(orden, desc) => navigate({ search: (prev) => ({ ...prev, orden, dir: desc ? 'desc' : 'asc', page: undefined }) })}
              />
            )
          }
        />

        {list.isError ? (
          <ListError error={list.error} onRetry={() => void list.refetch()} />
        ) : !data ? (
          <Loading text="Cargando compras…" />
        ) : data.items.length > 0 ? (
          <DataTable data={data.items} columns={columns} getRowId={(r) => r.id} onOpen={open} isMuted={(r) => r.isCancelled} />
        ) : hasFilters ? (
          <EmptyState icon={<ShoppingCart strokeWidth={1.5} />} text="Ninguna compra coincide con la búsqueda o el filtro." action={<Button onClick={() => navigate({ search: {} })}>Limpiar filtros</Button>} />
        ) : (
          <EmptyState
            icon={<ShoppingCart strokeWidth={1.5} />}
            title="Todavía no hay compras"
            text="Registra la factura de un proveedor y la mercadería entrará al stock."
            action={
              <Button variant="primary" onClick={openNew}>
                <Plus />
                Registrar compra
              </Button>
            }
          />
        )}

        <Pagination
          info={data}
          onPage={(p) => navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })}
          onPageSize={(filas) => navigate({ search: (prev) => ({ ...prev, filas, page: undefined }) })}
        />
      </ListPanel>
    </>
  )
}
