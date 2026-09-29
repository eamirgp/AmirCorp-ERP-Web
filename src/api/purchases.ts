import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'

export type PurchaseRow = Schemas['ListPurchasesResponseDto']
export type PurchaseDetail = Schemas['GetPurchaseResponseDto']
export type PurchaseInput = Schemas['CreatePurchaseRequest']
export type PurchasePreviewInput = Schemas['PreviewPurchaseRequest']

export type PurchaseSortBy = NonNullable<Schemas['PurchaseSortBy']>

export interface PurchaseListParams {
  q?: string
  page: number
  pageSize?: number
  companyId?: string
  sortBy?: PurchaseSortBy
  descending?: boolean
}

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (p: PurchaseListParams) => [...purchaseKeys.lists(), p] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
}

export const purchaseListQuery = (p: PurchaseListParams) =>
  queryOptions({
    queryKey: purchaseKeys.list(p),
    queryFn: () =>
      unwrap(
        api.GET('/api/purchases', {
          // Sin orden elegido no se envía nada: la API aplica su orden por defecto y lo informa en la respuesta.
          params: {
            query: {
              Page: p.page,
              PageSize: p.pageSize,
              SearchTerm: p.q || undefined,
              CompanyId: p.companyId,
              SortBy: p.sortBy,
              SortDescending: p.sortBy ? p.descending : undefined,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  })

export const purchaseQuery = (id: string) =>
  queryOptions({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/purchases/{id}', { params: { path: { id } } })),
  })

/**
 * Montos y totales calculados por la API mientras se llena la compra. El frontend no calcula nada:
 * solo muestra lo que devuelve este endpoint.
 */
export const purchasePreviewQuery = (input: PurchasePreviewInput) =>
  queryOptions({
    queryKey: [...purchaseKeys.all, 'preview', input],
    queryFn: () => unwrap(api.POST('/api/purchases/preview', { body: input })),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  })

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PurchaseInput) => unwrap(api.POST('/api/purchases', { body: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.lists() }),
  })
}

export function useCancelPurchase(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cancellationReason: string) => unwrap(api.PATCH('/api/purchases/{id}/cancel', { params: { path: { id } }, body: { cancellationReason } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}
