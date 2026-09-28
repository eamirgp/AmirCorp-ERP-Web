import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'

export type AuditEntry = Schemas['AuditEntryDto']
export type AuditEntityType = NonNullable<Schemas['AuditEntityType']>
export type AuditAction = NonNullable<Schemas['AuditAction']>

export interface AuditListParams {
  page: number
  pageSize?: number
  q?: string
  entityType?: AuditEntityType
  action?: AuditAction
  userId?: string
  /** Días en formato yyyy-mm-dd; la API los interpreta en hora de Perú. */
  from?: string
  to?: string
}

export const auditKeys = {
  all: ['audit'] as const,
  list: (p: AuditListParams) => [...auditKeys.all, 'list', p] as const,
  record: (entityType: AuditEntityType, entityId: string) => [...auditKeys.all, 'record', entityType, entityId] as const,
}

// El historial cambia con cada guardado: siempre se pide de nuevo al abrirlo.
export const auditListQuery = (p: AuditListParams) =>
  queryOptions({
    queryKey: auditKeys.list(p),
    queryFn: () =>
      unwrap(
        api.GET('/api/audit', {
          params: {
            query: {
              Page: p.page,
              PageSize: p.pageSize,
              SearchTerm: p.q || undefined,
              EntityType: p.entityType,
              Action: p.action,
              UserId: p.userId,
              From: p.from,
              To: p.to,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 0,
  })

const HISTORY_PAGE_SIZE = 20

/** Historial de un registro, de lo más reciente a lo más antiguo, con "Ver más" para las páginas siguientes. */
export const recordHistoryQuery = (entityType: AuditEntityType, entityId: string) =>
  infiniteQueryOptions({
    queryKey: auditKeys.record(entityType, entityId),
    queryFn: ({ pageParam }) =>
      unwrap(api.GET('/api/audit', { params: { query: { EntityType: entityType, EntityId: entityId, Page: pageParam, PageSize: HISTORY_PAGE_SIZE } } })),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    staleTime: 0,
  })
