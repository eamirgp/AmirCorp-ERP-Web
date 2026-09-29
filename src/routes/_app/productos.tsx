import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { FileSpreadsheet, PackagePlus, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { productListQuery, useToggleProduct, type ProductRow, type ProductSortBy } from '@/api/products'
import { Button } from '@/components/ui/button'
import { FilterBar, FilterChip, SortMenu, type Option } from '@/components/ui/filters'
import { EmptyState, Loading, Pagination, SearchBox } from '@/components/ui/list-controls'
import { ErrorList, PageHeader } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { ProductFormDialog } from '@/features/products/product-form-dialog'
import { ProductImportDialog } from '@/features/products/product-import-dialog'
import { ProductsTable } from '@/features/products/products-table'
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
  editar: z.string().optional().catch(undefined),
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

  // Abrir un producto desde la paleta de comandos (?editar=id).
  useEffect(() => {
    if (!search.editar || !list.data) return
    const found = list.data.items.find((p) => p.id === search.editar)
    if (found) setEditing(found)
    navigate({ search: (prev) => ({ ...prev, editar: undefined }), replace: true })
  }, [search.editar, list.data, navigate])

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeForm = () => {
    setEditing(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const onSearch = useCallback((q: string | undefined) => navigate({ search: (prev) => ({ ...prev, q, page: undefined }), replace: true }), [navigate])

  const onToggle = useCallback(
    (p: ProductRow) =>
      toggle.mutate(
        { id: p.id, active: !p.isActive },
        { onSuccess: () => toast.ok(`${p.code} ${p.isActive ? 'desactivado' : 'activado'}`), onError: (e) => toast.error(errorMessages(e)[0]) },
      ),
    [toggle],
  )

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
            <Button variant="primary" onClick={openNew} title="Atajo: N">
              <Plus />
              Nuevo producto
            </Button>
          </>
        }
      />

      <section className="flex flex-col">
        <ViewTabs screen="Products" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={onSearch} placeholder="Buscar por código o nombre" />}
          filters={<FilterChip label="Estado" options={statusOptions} value={search.estado} onChange={(estado) => navigate({ search: (prev) => ({ ...prev, estado, page: undefined }) })} />}
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
          <ErrorList messages={errorMessages(list.error)} />
        ) : !data ? (
          <Loading text="Cargando productos…" />
        ) : data.items.length > 0 ? (
          <ProductsTable
            rows={data.items}
            onEdit={setEditing}
            onToggle={onToggle}
            onHistory={(p) => setHistory({ entityType: 'Product', entityId: p.id, label: `${p.code} · ${p.name}` })}
          />
        ) : hasFilters ? (
          <EmptyState icon={<PackagePlus strokeWidth={1.5} />} text="Ningún producto coincide con la búsqueda o el filtro." />
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
      </section>

      <ProductFormDialog open={!!search.nuevo || editing !== null} product={editing} onClose={closeForm} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
      <ProductImportDialog open={!!search.importar} onClose={() => navigate({ search: (prev) => ({ ...prev, importar: undefined }), replace: true })} />
    </>
  )
}
