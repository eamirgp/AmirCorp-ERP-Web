import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'

// Los catálogos casi nunca cambian: se piden una vez por sesión.
export const unitsOfMeasureQuery = queryOptions({
  queryKey: ['catalogs', 'units-of-measure'],
  queryFn: () => unwrap(api.GET('/api/catalogs/units-of-measure')),
  staleTime: Infinity,
})

export const igvAffectationsQuery = queryOptions({
  queryKey: ['catalogs', 'igv-affectations'],
  queryFn: () => unwrap(api.GET('/api/catalogs/igv-affectations')),
  staleTime: Infinity,
})
