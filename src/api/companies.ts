import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type CompanyRow = Schemas['ListCompaniesResponseDto']
export type CompanyInput = Schemas['CreateCompanyRequest']

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  detail: (id: string) => [...companyKeys.all, 'detail', id] as const,
}

export const companiesQuery = queryOptions({
  queryKey: companyKeys.lists(),
  queryFn: () => unwrap(api.GET('/api/companies')),
})

/** Detalle de una empresa, con quién la creó y quién la modificó. */
export const companyQuery = (id: string) =>
  queryOptions({
    queryKey: companyKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/companies/{id}', { params: { path: { id } } })),
  })

export function useSaveCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CompanyInput }) =>
      id
        ? unwrap(api.PUT('/api/companies/{id}', { params: { path: { id } }, body: input })).then(() => id)
        : unwrap(api.POST('/api/companies', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
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
