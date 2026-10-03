import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type CompanyRow = Schemas['ListCompaniesResponseDto']
export type CompanyInput = Schemas['CreateCompanyRequest']

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,}

export const companiesQuery = queryOptions({
  queryKey: companyKeys.lists(),
  queryFn: () => unwrap(api.GET('/api/companies')),
})

export function useSaveCompany() {
  const qc = useQueryClient()
  return useMutation({
    // edit.rowVersion: la versión que se abrió en el formulario; si otra persona la cambió mientras tanto, la API responde 409.
    mutationFn: ({ edit, input }: { edit?: { id: string; rowVersion: number }; input: CompanyInput }) =>
      edit
        ? unwrap(api.PUT('/api/companies/{id}', { params: { path: { id: edit.id } }, body: { ...input, rowVersion: edit.rowVersion } })).then(() => edit.id)
        : unwrap(api.POST('/api/companies', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
  })
}

/** Busca el RUC en SUNAT (a través de la API) para llenar la razón social. */
export const useLookupCompanyRuc = () =>
  useMutation({
    // companyId: la empresa que se está editando, para que la API no avise "ya registrada" por ella misma.
    mutationFn: ({ ruc, companyId }: { ruc: string; companyId?: string }) =>
      unwrap(api.GET('/api/companies/ruc-lookup', { params: { query: { ruc, companyId } } })),
  })

export const useToggleCompany = () =>
  useToggleActive<CompanyRow>(companyKeys.lists(), (id, active) =>
    unwrap(
      active
        ? api.PATCH('/api/companies/{id}/activate', { params: { path: { id } } })
        : api.PATCH('/api/companies/{id}/deactivate', { params: { path: { id } } }),
    ),
  )
