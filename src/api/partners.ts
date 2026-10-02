import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'

export type PartnerRow = Schemas['ListBusinessPartnersResponseDto']
export type PartnerInput = Schemas['CreateBusinessPartnerRequest']
export type PartnerRole = 'clientes' | 'proveedores'
export type PartnerSortBy = NonNullable<Schemas['BusinessPartnerSortBy']>
export type IdentityDocumentType = Schemas['IdentityDocumentType']
/** Rol en la API: Supplier (compras) o Client (ventas). */
export type PartnerApiRole = 'Client' | 'Supplier'
/** Filtro "Estado" de clientes y proveedores: el bloqueo del rol de la lista. */
export type BlockFilter = 'activos' | 'bloqueados'

export interface PartnerListParams {
  q?: string
  page: number
  pageSize?: number
  status?: BlockFilter
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
              IsBlocked: p.status ? p.status === 'bloqueados' : undefined,
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

/** Proveedores con compras sin bloquear que coinciden con el texto (para elegir uno en una compra). */
export const searchSuppliers = (term: string) =>
  unwrap(
    api.GET('/api/partners', {
      params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsBlocked: false, PartnerRoleFilter: 'Supplier' } },
    }),
  ).then((r) => r.items)

export type FoundPartner = Schemas['FoundBusinessPartnerDto']

/** Quién tiene ya ese documento, o null si nadie (la API responde 404). */
export async function findPartnerByDocument(identityDocumentType: IdentityDocumentType, documentNumber: string): Promise<FoundPartner | null> {
  const r = await api.GET('/api/partners/by-document', { params: { query: { identityDocumentType: identityDocumentType!, documentNumber } } })
  if (r.response.status === 404) return null
  return unwrap(Promise.resolve(r))
}

/**
 * La fila completa (con su versión) de alguien que ya existe en esta lista, para abrir su ficha desde el aviso de
 * duplicado. Se busca por su documento en la misma lista.
 */
export const fetchPartnerRow = (id: string, documentNumber: string, role: PartnerRole) =>
  unwrap(api.GET('/api/partners', { params: { query: { Page: 1, PageSize: 10, SearchTerm: documentNumber, PartnerRoleFilter: roleFilter[role] } } })).then(
    (r) => r.items.find((p) => p.id === id) ?? null,
  )

/** "Registrar también como cliente / proveedor": el mismo registro pasa a estar en las dos listas. */
export function useAddPartnerRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: PartnerApiRole }) => unwrap(api.PATCH('/api/partners/{id}/roles/{role}', { params: { path: { id, role } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  })
}

export type DocumentLookup = Schemas['LookupDocumentResponseDto']

/** Busca el RUC en SUNAT o el DNI en RENIEC (a través de la API) para llenar el nombre o la razón social. */
export const useLookupDocument = () =>
  useMutation({
    // partnerId: el registro que se está editando, para que la API no avise "ya está registrado" por él mismo.
    mutationFn: ({ identityDocumentType, documentNumber, partnerId }: { identityDocumentType: IdentityDocumentType; documentNumber: string; partnerId?: string }) =>
      unwrap(api.GET('/api/partners/document-lookup', { params: { query: { identityDocumentType: identityDocumentType!, documentNumber, partnerId } } })),
  })

export function useSavePartner() {
  const qc = useQueryClient()
  return useMutation({
    // Al editar se envía la versión que se abrió; si otra persona lo cambió mientras tanto, la API responde 409.
    // Al editar no se envían los roles: se agregan con su propia acción (useAddPartnerRole).
    mutationFn: ({ edit, input }: { edit?: { id: string; rowVersion: number }; input: PartnerInput }) => {
      if (!edit) return unwrap(api.POST('/api/partners', { body: input })).then((r) => r.id)
      const { isClient: _client, isSupplier: _supplier, ...data } = input
      return unwrap(api.PUT('/api/partners/{id}', { params: { path: { id: edit.id } }, body: { ...data, rowVersion: edit.rowVersion } })).then(() => edit.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  })
}

/**
 * Bloquear o desbloquear un rol: Supplier bloquea las compras y Client las ventas. El otro rol no cambia.
 * Se recarga todo lo de clientes y proveedores porque el registro puede estar en las dos listas.
 */
export function useBlockPartnerRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role, blocked, reason }: { id: string; role: PartnerApiRole; blocked: boolean; reason?: string }) =>
      unwrap(
        blocked
          ? api.PATCH('/api/partners/{id}/roles/{role}/block', { params: { path: { id, role } }, body: { reason: reason || null } })
          : api.PATCH('/api/partners/{id}/roles/{role}/unblock', { params: { path: { id, role } } }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  })
}
