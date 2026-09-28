import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toIsActive, type ActiveFilter } from '@/lib/filters'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type PartnerRow = Schemas['ListBusinessPartnersResponseDto']
export type PartnerInput = Schemas['CreateBusinessPartnerRequest']
export type PartnerRole = 'clientes' | 'proveedores'
export type PartnerSortBy = NonNullable<Schemas['BusinessPartnerSortBy']>
export type IdentityDocumentType = Schemas['IdentityDocumentType']

export interface PartnerListParams {
  q?: string
  page: number
  pageSize: number
  status?: ActiveFilter
  role?: PartnerRole
  documentType?: IdentityDocumentType
  sortBy?: PartnerSortBy
  descending?: boolean
}

export const partnerKeys = {
  lists: () => ['partners', 'list'] as const,
  list: (p: PartnerListParams) => [...partnerKeys.lists(), p] as const,
}

const roleFilter = { clientes: 'Client', proveedores: 'Supplier' } as const

export const partnerListQuery = (p: PartnerListParams) =>
  queryOptions({
    queryKey: partnerKeys.list(p),
    queryFn: () =>
      unwrap(
        api.GET('/api/partners', {
          params: {
            query: {
              Page: p.page,
              PageSize: p.pageSize,
              SearchTerm: p.q || undefined,
              IsActive: toIsActive(p.status),
              PartnerRoleFilter: p.role ? roleFilter[p.role] : undefined,
              IdentityDocumentType: p.documentType,
              SortBy: p.sortBy ?? 'Name',
              SortDescending: p.descending,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  })

/** Proveedores activos que coinciden con el texto (para elegir uno en una compra). */
export const searchSuppliers = (term: string) =>
  unwrap(
    api.GET('/api/partners', {
      params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsActive: true, PartnerRoleFilter: 'Supplier', SortBy: 'Name' } },
    }),
  ).then((r) => r.items)

export function useSavePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PartnerInput }) =>
      id
        ? unwrap(api.PUT('/api/partners/{id}', { params: { path: { id } }, body: input })).then(() => id)
        : unwrap(api.POST('/api/partners', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.lists() }),
  })
}

export const useTogglePartner = () =>
  useToggleActive<PartnerRow>(partnerKeys.lists(), (id, active) =>
    unwrap(
      active
        ? api.PATCH('/api/partners/{id}/activate', { params: { path: { id } } })
        : api.PATCH('/api/partners/{id}/deactivate', { params: { path: { id } } }),
    ),
  )
