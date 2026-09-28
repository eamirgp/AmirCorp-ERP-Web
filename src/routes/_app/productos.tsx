import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, PackagePlus, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { productListQuery, useToggleProduct, type ProductRow, type ProductStatus } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { ErrorList, Kbd, PageHeader, Panel } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { ProductFormDialog } from '@/features/products/product-form-dialog'
import { ProductsTable } from '@/features/products/products-table'
import { formatInt } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'

const PAGE_SIZE = 20

// El estado de la pantalla vive en la URL: se puede compartir, recargar y usar el botón Atrás.
const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  estado: z.enum(['activos', 'inactivos', 'todos']).optional().catch(undefined),
  nuevo: z.boolean().optional().catch(undefined),
  editar: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/productos')({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ q: search.q, page: search.page, estado: search.estado }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(unitsOfMeasureQuery)
    void context.queryClient.prefetchQuery(igvAffectationsQuery)
    return context.queryClient.ensureQueryData(
      productListQuery({ q: deps.q, page: deps.page ?? 1, pageSize: PAGE_SIZE, status: deps.estado ?? 'activos' }),
    )
  },
  component: ProductsPage,
})

const statusTabs: { value: ProductStatus; label: string }[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
]

function ProductsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const status = search.estado ?? 'activos'
  const page = search.page ?? 1
  const list = useQuery(productListQuery({ q: search.q, page, pageSize: PAGE_SIZE, status }))
  const toggle = useToggleProduct()

  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [term, setTerm] = useState(search.q ?? '')
  const searchRef = useRef<HTMLInputElement>(null)

  // La búsqueda se aplica 250 ms después de dejar de escribir.
  useEffect(() => {
    const q = term.trim() || undefined
    if (q === search.q) return
    const t = setTimeout(() => navigate({ search: (prev) => ({ ...prev, q, page: undefined }), replace: true }), 250)
    return () => clearTimeout(t)
  }, [term, search.q, navigate])

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
  useHotkey('/', () => searchRef.current?.focus())

  const onToggle = useCallback(
    (p: ProductRow) =>
      toggle.mutate(
        { id: p.id, active: !p.isActive },
        {
          onSuccess: () => toast.ok(`${p.code} ${p.isActive ? 'desactivado' : 'activado'}`),
          onError: (e) => toast.error(errorMessages(e)[0]),
        },
      ),
    [toggle],
  )

  const data = list.data
  const total = data?.totalCount ?? 0
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo compartido por tus empresas. El stock y el costo se llevan por separado en cada una."
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus />
            Nuevo producto
            <Kbd>N</Kbd>
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <Input ref={searchRef} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por código o nombre" className="pr-9 pl-9" aria-label="Buscar productos" />
            <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
              <Kbd>/</Kbd>
            </span>
          </div>
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5" role="tablist" aria-label="Estado">
            {statusTabs.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={status === t.value}
                onClick={() => navigate({ search: (prev) => ({ ...prev, estado: t.value === 'activos' ? undefined : t.value, page: undefined }) })}
                className="rounded-md px-3 py-1.5 text-[13px] font-medium text-muted aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm"
              >
                {t.label}
              </button>
            ))}
          </div>
          {list.isFetching && !list.isPending && <span className="text-[12.5px] text-faint">Actualizando…</span>}
        </div>

        {list.isError ? (
          <div className="p-4">
            <ErrorList messages={errorMessages(list.error)} />
          </div>
        ) : data && data.items.length > 0 ? (
          <ProductsTable rows={data.items} onEdit={setEditing} onToggle={onToggle} />
        ) : data ? (
          <EmptyState filtered={!!search.q || status !== 'activos'} onCreate={openNew} />
        ) : (
          <div className="p-10 text-center text-[13.5px] text-muted">Cargando productos…</div>
        )}

        {total > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px] text-muted">
            <span className="num">
              {formatInt(from)}–{formatInt(to)} de {formatInt(total)}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 === 1 ? undefined : page - 1 }) })}>
                <ChevronLeft />
                Anterior
              </Button>
              <span className="num px-2">
                {page} / {lastPage}
              </span>
              <Button size="sm" variant="ghost" disabled={page >= lastPage} onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}>
                Siguiente
                <ChevronRight />
              </Button>
            </div>
          </footer>
        )}
      </Panel>

      <ProductFormDialog open={!!search.nuevo || editing !== null} product={editing} onClose={closeForm} />
    </>
  )
}

function EmptyState({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-text">
        <PackagePlus className="size-5" />
      </span>
      {filtered ? (
        <p className="text-[13.5px] text-muted">Ningún producto coincide con la búsqueda o el filtro.</p>
      ) : (
        <>
          <p className="font-display text-[17px] font-bold">Todavía no hay productos</p>
          <p className="max-w-sm text-[13.5px] text-muted">Crea el primero. Luego podrás usarlo en compras, importaciones y ventas de cualquiera de tus empresas.</p>
          <Button variant="primary" onClick={onCreate}>
            <Plus />
            Crear producto
          </Button>
        </>
      )}
    </div>
  )
}
