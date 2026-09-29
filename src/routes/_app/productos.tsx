import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Download, FileSpreadsheet, PackagePlus, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { productListQuery, useToggleProduct, type ProductRow, type ProductSortBy } from '@/api/products'
import { Button } from '@/components/ui/button'
import { FilterBar, FilterChip, SortMenu, type Option } from '@/components/ui/filters'
import { EmptyState, Loading, Pagination, SearchBox, ListPanel } from '@/components/ui/list-controls'
import { ErrorList, PageHeader } from '@/components/ui/misc'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { ProductExportDialog, useProductExport } from '@/features/products/product-export-dialog'
import { ProductFormDialog } from '@/features/products/product-form-dialog'
import { ProductImportDialog } from '@/features/products/product-import-dialog'
import { ProductsTable } from '@/features/products/products-table'
import { useConfirmToggle } from '@/features/shared/use-confirm-toggle'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { directionSchema, pageSchema, pageSizeSchema, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

// El estado de la pantalla vive en la URL: se puede compartir, recargar y usar el botón Atrás.
const sortOptions: Option<ProductSortBy>[] = [
  { value: 'Name', label: 'Nombre' },
  { value: 'CreatedAt', label: 'Fecha de creación' },
]

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: pageSchema,
  filas: pageSizeSchema,
  estado: statusSchema,
  orden: z.enum(['Name', 'CreatedAt']).optional().catch(undefined),
  dir: directionSchema,
  nuevo: z.boolean().optional().catch(undefined),
  importar: z.boolean().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

const listParams = (s: Search) => ({ q: s.q, page: s.page ?? 1, pageSize: s.filas, status: s.estado, sortBy: s.orden, descending: s.orden ? s.dir === 'desc' : undefined })

export const Route = createFileRoute('/_app/productos')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('Products'),
  loaderDeps: ({ search }) => listParams(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(unitsOfMeasureQuery)
    void context.queryClient.prefetchQuery(igvAffectationsQuery)
    return context.queryClient.ensureQueryData(productListQuery(deps))
  },
  component: ProductsPage,
})

function ProductsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(productListQuery(listParams(search)))
  const hasFilters = !!(search.q || search.estado)
  const toggle = useToggleProduct()
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)
  const [exporting, setExporting] = useState(false)
  const exporter = useProductExport()
  const { q, status, sortBy, descending } = listParams(search)
  const exportParams = { q, status, sortBy, descending }
  // Sin filtros descarga todo al instante; con filtros pregunta si solo lo que se ve o todo.
  const startExport = () => (hasFilters ? setExporting(true) : void exporter.run(exportParams))
  const closeImport = () => navigate({ search: (prev) => ({ ...prev, importar: undefined }), replace: true })

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const onSearch = useCallback((q: string | undefined) => navigate({ search: (prev) => ({ ...prev, q, page: undefined }), replace: true }), [navigate])

  const activation = useConfirmToggle<ProductRow>(toggle, {
    title: '¿Desactivar este producto?',
    body: (p) => (
      <>
        <strong className="font-medium text-ink">
          {p.code} · {p.name}
        </strong>{' '}
        dejará de aparecer al registrar compras y ventas. Su historial se conserva y puedes activarlo de nuevo cuando quieras.
      </>
    ),
    done: (p, active) => `${p.code} ${active ? 'activado' : 'desactivado'}`,
  })
  const clearFilters = () => navigate({ search: {} })

  const data = list.data

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo compartido por tus empresas. El stock y el costo se llevan por separado en cada una."
        actions={
          <>
            <Button onClick={() => navigate({ search: (prev) => ({ ...prev, importar: true }) })}>
              <FileSpreadsheet />
              Importar
            </Button>
            <Button onClick={startExport} loading={exporter.busy}>
              <Download />
              Exportar
            </Button>
            <Button variant="primary" onClick={openNew} title="Atajo: N">
              <Plus />
              Nuevo producto
            </Button>
          </>
        }
      />

      <ListPanel>
        <ViewTabs screen="Products" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={onSearch} placeholder="Buscar por código, código del proveedor o nombre" />}
          filters={<FilterChip label="Estado" options={statusOptions} value={search.estado} onChange={(estado) => navigate({ search: (prev) => ({ ...prev, estado, page: undefined }) })} />}
          onClear={isCustomized(search) ? clearFilters : undefined}
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
          <ErrorList messages={errorMessages(list.error)} />
        ) : !data ? (
          <Loading text="Cargando productos…" />
        ) : data.items.length > 0 ? (
          <ProductsTable
            rows={data.items}
            onEdit={setEditing}
            onToggle={activation.request}
            busyId={activation.busyId}
            onHistory={(p) => setHistory({ entityType: 'Product', entityId: p.id, label: `${p.code} · ${p.name}` })}
          />
        ) : hasFilters ? (
          <EmptyState icon={<PackagePlus strokeWidth={1.5} />} text="Ningún producto coincide con la búsqueda o el filtro." action={<Button onClick={clearFilters}>Limpiar filtros</Button>} />
        ) : (
          <EmptyState
            icon={<PackagePlus strokeWidth={1.5} />}
            title="Todavía no hay productos"
            text="Crea el primero. Luego podrás usarlo en compras, importaciones y ventas de cualquiera de tus empresas."
            action={
              <Button variant="primary" onClick={openNew}>
                <Plus />
                Crear producto
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

      <ProductFormDialog open={!!search.nuevo || editing !== null} product={editing} onClose={closeForm} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
      {/* Mientras llega la lista con los filtros nuevos no se muestra el conteo anterior. */}
      {exporting && <ProductExportDialog open params={exportParams} matching={list.isPlaceholderData ? undefined : data?.totalCount} onClose={() => setExporting(false)} />}
      {activation.dialog}
      <ProductImportDialog
        open={!!search.importar}
        onClose={closeImport}
        onExport={() => {
          closeImport()
          startExport()
        }}
      />
    </>
  )
}
