import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type CompanyRow = Schemas['ListCompaniesResponseDto']
export type CompanyInput = Schemas['CreateCompanyRequest']

export const companyKeys = { lists: () => ['companies', 'list'] as const }

export const companiesQuery = queryOptions({
  queryKey: companyKeys.lists(),
  queryFn: () => unwrap(api.GET('/api/companies')),
})

export function useSaveCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CompanyInput }) =>
      id
        ? unwrap(api.PUT('/api/companies/{id}', { params: { path: { id } }, body: input })).then(() => id)
        : unwrap(api.POST('/api/companies', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.lists() }),
  })
}

export const useToggleCompany = () =>
  useToggleActive<CompanyRow>(companyKeys.lists(), (id, active) =>
    unwrap(
      active
        ? api.PATCH('/api/companies/{id}/activate', { params: { path: { id } } })
        : api.PATCH('/api/companies/{id}/deactivate', { params: { path: { id } } }),
    ),
  )
