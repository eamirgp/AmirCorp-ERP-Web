import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toIsActive, type ActiveFilter } from '@/lib/filters'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type ProductRow = Schemas['ListProductsResponseDto']
export type ProductInput = Schemas['CreateProductRequest']
export type ProductSortBy = NonNullable<Schemas['ProductSortBy']>

export interface ProductListParams {
  q?: string
  page: number
  pageSize: number
  status?: ActiveFilter
  sortBy?: ProductSortBy
  descending?: boolean
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (p: ProductListParams) => [...productKeys.lists(), p] as const,
}

export const productListQuery = (p: ProductListParams) =>
  queryOptions({
    queryKey: productKeys.list(p),
    queryFn: () =>
      unwrap(
        api.GET('/api/products', {
          params: {
            query: {
              Page: p.page,
              PageSize: p.pageSize,
              SearchTerm: p.q || undefined,
              IsActive: toIsActive(p.status),
              SortBy: p.sortBy ?? 'Name',
              SortDescending: p.descending,
            },
          },
        }),
      ),
    // Mientras llega la página siguiente se sigue mostrando la actual: la tabla no parpadea.
    placeholderData: keepPreviousData,
  })

/** Productos activos que coinciden con el texto (para elegir uno en una línea de compra). */
export const searchProducts = (term: string) =>
  unwrap(api.GET('/api/products', { params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsActive: true, SortBy: 'Name' } } })).then(
    (r) => r.items,
  )

export function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProductInput }) =>
      id
        ? unwrap(api.PUT('/api/products/{id}', { params: { path: { id } }, body: input })).then(() => id)
        : unwrap(api.POST('/api/products', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.lists() }),
  })
}

export const useToggleProduct = () =>
  useToggleActive<ProductRow>(productKeys.lists(), (id, active) =>
    unwrap(
      active
        ? api.PATCH('/api/products/{id}/activate', { params: { path: { id } } })
        : api.PATCH('/api/products/{id}/deactivate', { params: { path: { id } } }),
    ),
  )
