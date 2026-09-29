import { createFileRoute } from '@tanstack/react-router'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { partnerListQuery } from '@/api/partners'
import { PartnersPage, partnerListParams, partnerRoles, partnerSearchSchema } from '@/features/partners/partners-page'
import { applyDefaultView } from '@/features/saved-views/view-filters'

const config = partnerRoles.suppliers

export const Route = createFileRoute('/_app/proveedores')({
  validateSearch: (search) => partnerSearchSchema.parse(search),
  beforeLoad: applyDefaultView(config.screen),
  loaderDeps: ({ search }) => partnerListParams(config.role, search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(identityDocumentTypesQuery)
    void context.queryClient.prefetchQuery(countriesQuery)
    return context.queryClient.ensureQueryData(partnerListQuery(deps))
  },
  component: SuppliersPage,
})

function SuppliersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return <PartnersPage config={config} search={search} setSearch={(update, options) => navigate({ search: update, replace: options?.replace })} />
}
