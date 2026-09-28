import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'

export type ProductRow = Schemas['ListProductsResponseDto']
export type ProductInput = Schemas['CreateProductRequest']
export type ProductStatus = 'activos' | 'inactivos' | 'todos'

export interface ProductListParams {
  q?: string
  page: number
  pageSize: number
  status: ProductStatus
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
              IsActive: p.status === 'todos' ? undefined : p.status === 'activos',
              SortBy: 'Name',
            },
          },
        }),
      ),
    // Mientras llega la página siguiente se sigue mostrando la actual: la tabla no parpadea.
    placeholderData: keepPreviousData,
  })

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

/** Activa o desactiva con actualización optimista: la fila cambia al instante y se revierte si falla. */
export function useToggleProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      unwrap(
        active
          ? api.PATCH('/api/products/{id}/activate', { params: { path: { id } } })
          : api.PATCH('/api/products/{id}/deactivate', { params: { path: { id } } }),
      ),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: productKeys.lists() })
      const snapshot = qc.getQueriesData({ queryKey: productKeys.lists() })
      qc.setQueriesData<{ items: ProductRow[] }>({ queryKey: productKeys.lists() }, (old) =>
        old ? { ...old, items: old.items.map((p) => (p.id === id ? { ...p, isActive: active } : p)) } : old,
      )
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.lists() }),
  })
}
