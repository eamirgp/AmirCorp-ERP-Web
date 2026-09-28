import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'

// Los catálogos casi nunca cambian: se piden una vez por sesión.
const catalog = <T>(key: string, fn: () => Promise<T>) => queryOptions({ queryKey: ['catalogs', key], queryFn: fn, staleTime: Infinity })

export const unitsOfMeasureQuery = catalog('units-of-measure', () => unwrap(api.GET('/api/catalogs/units-of-measure')))
export const igvAffectationsQuery = catalog('igv-affectations', () => unwrap(api.GET('/api/catalogs/igv-affectations')))
export const countriesQuery = catalog('countries', () => unwrap(api.GET('/api/catalogs/countries')))
export const currenciesQuery = catalog('currencies', () => unwrap(api.GET('/api/catalogs/currencies')))
export const taxDocumentTypesQuery = catalog('tax-document-types', () => unwrap(api.GET('/api/catalogs/tax-document-types')))
export const invoicePriceTypesQuery = catalog('invoice-price-types', () => unwrap(api.GET('/api/catalogs/invoice-price-types')))
export const identityDocumentTypesQuery = catalog('identity-document-types', () => unwrap(api.GET('/api/partners/identity-document-types')))
export const assignableRolesQuery = catalog('assignable-roles', () => unwrap(api.GET('/api/users/roles')))
export const auditEntityTypesQuery = catalog('audit-entity-types', () => unwrap(api.GET('/api/audit/entity-types')))
export const auditActionsQuery = catalog('audit-actions', () => unwrap(api.GET('/api/audit/actions')))
