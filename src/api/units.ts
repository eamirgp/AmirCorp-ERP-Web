import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitsOfMeasureQuery } from './catalogs'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type UnitRow = Schemas['UnitOfMeasureListItemDto']

export const unitKeys = {
  all: ['units-of-measure'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
}

/** Todo el catálogo SUNAT, para la pantalla de administración (primero las activas). */
export const unitsQuery = queryOptions({
  queryKey: unitKeys.lists(),
  queryFn: () => unwrap(api.GET('/api/units-of-measure')),
})

// Al cambiar una unidad también se refresca el catálogo de activas que usan productos y compras.
const catalogKey = unitsOfMeasureQuery.queryKey

export function useRenameUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => unwrap(api.PUT('/api/units-of-measure/{id}', { params: { path: { id } }, body: { name } })),
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
