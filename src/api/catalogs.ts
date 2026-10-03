import { queryOptions, useMutation } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'

export type ExchangeRate = Schemas['GetExchangeRateResponseDto']

/**
 * El tipo de cambio de esa fecha si la API ya lo tiene guardado (null si no): no consulta a SUNAT, así que la pantalla
 * puede pedirlo sola al elegir la fecha sin gastar consultas.
 */
export const storedExchangeRateQuery = (currency: string | undefined, date: string | undefined) =>
  queryOptions({
    queryKey: ['catalogs', 'exchange-rate', currency, date],
    queryFn: async (): Promise<ExchangeRate | null> => {
      const r = await api.GET('/api/catalogs/exchange-rate', {
        params: { query: { currency: currency as NonNullable<Schemas['Currency']>, date: date!, storedOnly: true } },
      })
      if (r.response.status === 404) return null
      return unwrap(Promise.resolve(r))
    },
    retry: false,
  })

/** Tipo de cambio venta de SUNAT para una moneda y una fecha (a través de la API), para llenar una compra en dólares. */
export const useExchangeRate = () =>
  useMutation({
    mutationFn: ({ currency, date }: { currency: NonNullable<Schemas['Currency']>; date: string }) =>
      unwrap(api.GET('/api/catalogs/exchange-rate', { params: { query: { currency, date } } })),
  })

// Los catálogos casi nunca cambian: se piden una vez por sesión.
const catalog = <T>(key: string, fn: () => Promise<T>) => queryOptions({ queryKey: ['catalogs', key], queryFn: fn, staleTime: Infinity })

export const unitsOfMeasureQuery = catalog('units-of-measure', () => unwrap(api.GET('/api/catalogs/units-of-measure')))
export const igvAffectationsQuery = catalog('igv-affectations', () => unwrap(api.GET('/api/catalogs/igv-affectations')))
export const countriesQuery = catalog('countries', () => unwrap(api.GET('/api/catalogs/countries')))
export const currenciesQuery = catalog('currencies', () => unwrap(api.GET('/api/catalogs/currencies')))
export const taxDocumentTypesQuery = catalog('tax-document-types', () => unwrap(api.GET('/api/catalogs/tax-document-types')))
export const invoicePriceTypesQuery = catalog('invoice-price-types', () => unwrap(api.GET('/api/catalogs/invoice-price-types')))
export const identityDocumentTypesQuery = catalog('identity-document-types', () => unwrap(api.GET('/api/partners/identity-document-types')))
/** Todos los roles, con canAssign: si quien usa el sistema puede darlo. */
export const userRolesQuery = catalog('user-roles', () => unwrap(api.GET('/api/users/roles')))
export const auditEntityTypesQuery = catalog('audit-entity-types', () => unwrap(api.GET('/api/audit/entity-types')))
export const auditActionsQuery = catalog('audit-actions', () => unwrap(api.GET('/api/audit/actions')))
