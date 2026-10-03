import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toListFilterQuery, type ListFilter } from '@/lib/filters'
import { unitsOfMeasureQuery } from './catalogs'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type UnitRow = Schemas['UnitOfMeasureListItemDto']

export const unitKeys = {
  all: ['units-of-measure'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
}

/**
 * El catálogo SUNAT para la pantalla de administración (primero las activas; cada grupo de la A a la Z). La API busca
 * y filtra; mientras llega la respuesta se sigue viendo la lista anterior.
 */
export const unitsListQuery = (filter: ListFilter) =>
  queryOptions({
    queryKey: [...unitKeys.lists(), filter],
    queryFn: () => unwrap(api.GET('/api/units-of-measure', { params: { query: toListFilterQuery(filter) } })),
    placeholderData: keepPreviousData,
  })

// Al cambiar una unidad también se refresca el catálogo de activas que usan productos y compras.
const catalogKey = unitsOfMeasureQuery.queryKey

export function useRenameUnit() {
  const qc = useQueryClient()
  return useMutation({
    // Se envía la versión que se vio en la lista: si otra persona la cambió mientras tanto, la API responde 409.
    mutationFn: ({ id, name, rowVersion }: { id: string; name: string; rowVersion: number }) =>
      unwrap(api.PUT('/api/units-of-measure/{id}', { params: { path: { id } }, body: { name, rowVersion } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: unitKeys.all })
      void qc.invalidateQueries({ queryKey: catalogKey })
    },
  })
}

export const useToggleUnit = () =>
  useToggleActive<UnitRow>(
    unitKeys.lists(),
    (id, active) =>
      unwrap(
        active
          ? api.PATCH('/api/units-of-measure/{id}/activate', { params: { path: { id } } })
          : api.PATCH('/api/units-of-measure/{id}/deactivate', { params: { path: { id } } }),
      ),
    [catalogKey],
  )
