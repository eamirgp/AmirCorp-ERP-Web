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
  pageSize?: number
  status?: ActiveFilter
  role?: PartnerRole
  documentType?: IdentityDocumentType
  sortBy?: PartnerSortBy
  descending?: boolean
}

export const partnerKeys = {
  all: ['partners'] as const,
  lists: () => [...partnerKeys.all, 'list'] as const,
  list: (p: PartnerListParams) => [...partnerKeys.lists(), p] as const,}

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
              // Sin orden elegido no se envía nada: la API aplica su orden por defecto y lo informa en la respuesta.
              SortBy: p.sortBy,
              SortDescending: p.sortBy ? p.descending : undefined,
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
      params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsActive: true, PartnerRoleFilter: 'Supplier' } },
    }),
  ).then((r) => r.items)

export type RucLookup = Schemas['LookupRucResponseDto']

/** Busca el RUC en SUNAT (a través de la API) para llenar la razón social. */
export const useLookupRuc = () =>
  useMutation({
    mutationFn: (ruc: string) => unwrap(api.GET('/api/partners/ruc-lookup/{ruc}', { params: { path: { ruc } } })),
  })

export function useSavePartner() {
  const qc = useQueryClient()
  return useMutation({
    // Al editar se envía la versión que se abrió; si otra persona lo cambió mientras tanto, la API responde 409.
    mutationFn: ({ edit, input }: { edit?: { id: string; rowVersion: number }; input: PartnerInput }) =>
      edit
        ? unwrap(api.PUT('/api/partners/{id}', { params: { path: { id: edit.id } }, body: { ...input, rowVersion: edit.rowVersion } })).then(() => edit.id)
        : unwrap(api.POST('/api/partners', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
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
