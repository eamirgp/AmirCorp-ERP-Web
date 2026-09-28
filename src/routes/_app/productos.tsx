import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackagePlus, Plus } from 'lucide-react'
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
import { ProductFormDialog } from '@/features/products/product-form-dialog'
import { ProductsTable } from '@/features/products/products-table'
import { countLabel, directionSchema, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

const PAGE_SIZE = 20

// El estado de la pantalla vive en la URL: se puede compartir, recargar y usar el botón Atrás.
const sortOptions: Option<ProductSortBy>[] = [
  { value: 'Name', label: 'Nombre' },
  { value: 'CreatedAt', label: 'Fecha de creación' },
]

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  estado: statusSchema,
  orden: z.enum(['Name', 'CreatedAt']).optional().catch(undefined),
  dir: directionSchema,
  nuevo: z.boolean().optional().catch(undefined),
  editar: z.string().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

const listParams = (s: Search) => ({ q: s.q, page: s.page ?? 1, pageSize: PAGE_SIZE, status: s.estado, sortBy: s.orden, descending: s.dir === 'desc' })

export const Route = createFileRoute('/_app/productos')({
  validateSearch: (search) => searchSchema.parse(search),
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
  const page = search.page ?? 1
  const list = useQuery(productListQuery(listParams(search)))
  const hasFilters = !!(search.q || search.estado)
  const toggle = useToggleProduct()
  const [editing, setEditing] = useState<ProductRow | null>(null)

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
          <Button variant="primary" onClick={openNew} title="Atajo: N">
            <Plus />
            Nuevo producto
          </Button>
        }
      />

      <section className="flex flex-col">
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={onSearch} placeholder="Buscar por código o nombre" />}
          filters={<FilterChip label="Estado" options={statusOptions} value={search.estado} onChange={(estado) => navigate({ search: (prev) => ({ ...prev, estado, page: undefined }) })} />}
          onClear={hasFilters ? () => navigate({ search: (prev) => ({ ...prev, q: undefined, estado: undefined, page: undefined }) }) : undefined}
          count={data ? countLabel(data.totalCount, 'producto', 'productos') : undefined}
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
          <Loading text="Cargando productos…" />
        ) : data.items.length > 0 ? (
          <ProductsTable rows={data.items} onEdit={setEditing} onToggle={onToggle} />
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

        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.totalCount ?? 0} onPage={(p) => navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })} />
      </section>

      <ProductFormDialog open={!!search.nuevo || editing !== null} product={editing} onClose={closeForm} />
    </>
  )
}
