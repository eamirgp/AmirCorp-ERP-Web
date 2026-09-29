import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { fileNameFrom } from '@/lib/download'
import { toIsActive, type ActiveFilter } from '@/lib/filters'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type ProductRow = Schemas['ListProductsResponseDto']
export type ProductInput = Schemas['CreateProductRequest']
export type ProductSortBy = NonNullable<Schemas['ProductSortBy']>

export interface ProductListParams {
  q?: string
  page: number
  pageSize?: number
  status?: ActiveFilter
  sortBy?: ProductSortBy
  descending?: boolean
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (p: ProductListParams) => [...productKeys.lists(), p] as const,
}

export const productListQuery = (p: ProductListParams) =>
  queryOptions({
    queryKey: productKeys.list(p),
    queryFn: () =>
      unwrap(
        api.GET('/api/products', {
          params: {
            query: {
              Page: p.page,
              PageSize: p.pageSize,
              SearchTerm: p.q || undefined,
              IsActive: toIsActive(p.status),
              // Sin orden elegido no se envía nada: la API aplica su orden por defecto y lo informa en la respuesta.
              SortBy: p.sortBy,
              SortDescending: p.sortBy ? p.descending : undefined,
            },
          },
        }),
      ),
    // Mientras llega la página siguiente se sigue mostrando la actual: la tabla no parpadea.
    placeholderData: keepPreviousData,
  })

/** Productos activos que coinciden con el texto (para elegir uno en una línea de compra). */
export const searchProducts = (term: string) =>
  unwrap(api.GET('/api/products', { params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsActive: true } } })).then(
    (r) => r.items,
  )

export function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProductInput }) =>
      id
        ? unwrap(api.PUT('/api/products/{id}', { params: { path: { id } }, body: input })).then(() => id)
        : unwrap(api.POST('/api/products', { body: input })).then((r) => r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  })
}

// ---------- Carga masiva con Excel ----------

export type ProductImportPreview = Schemas['ProductImportPreviewDto']
export type ProductImportRow = Schemas['ProductImportRowDto']

/** Descarga un archivo de la API y devuelve el contenido con el nombre que indica la API. */
async function download(request: Promise<{ data?: Blob; error?: unknown; response: Response }>, fallbackName: string) {
  const blob = await unwrap(request)
  const { response } = await request
  return { blob, fileName: fileNameFrom(response, fallbackName) }
}

export const downloadProductTemplate = () => download(api.GET('/api/products/import/template', { parseAs: 'blob' }), 'plantilla-productos.xlsx')

/** Filtros y orden de la pantalla que se pueden exportar (sin página ni filas por página). */
export type ProductExportParams = Pick<ProductListParams, 'q' | 'status' | 'sortBy' | 'descending'>

/** Productos en Excel. Sin filtros, todos; con filtros, solo los que coinciden y en el mismo orden de la pantalla. */
export const exportProducts = (p: ProductExportParams = {}) =>
  download(
    api.GET('/api/products/export', {
      params: {
        query: {
          SearchTerm: p.q || undefined,
          IsActive: toIsActive(p.status),
          SortBy: p.sortBy,
          SortDescending: p.sortBy ? p.descending : undefined,
        },
      },
      parseAs: 'blob',
    }),
    'productos.xlsx',
  )

/** El archivo va como multipart/form-data; el navegador arma los límites del envío. */
const importForm = (file: File, updateExisting: boolean) => ({
  body: { File: file as unknown as string, UpdateExisting: updateExisting },
  bodySerializer: (body: { File?: string; UpdateExisting?: boolean }) => {
    const form = new FormData()
    form.append('File', body.File as unknown as Blob)
    form.append('UpdateExisting', String(body.UpdateExisting ?? false))
    return form
  },
})

export const previewProductImport = (file: File, updateExisting: boolean) =>
  unwrap(api.POST('/api/products/import/preview', importForm(file, updateExisting)))

export function useImportProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, updateExisting }: { file: File; updateExisting: boolean }) =>
      unwrap(api.POST('/api/products/import', importForm(file, updateExisting))),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export const useToggleProduct = () =>
  useToggleActive<ProductRow>(productKeys.lists(), (id, active) =>
    unwrap(
      active
        ? api.PATCH('/api/products/{id}/activate', { params: { path: { id } } })
        : api.PATCH('/api/products/{id}/deactivate', { params: { path: { id } } }),
    ),
  )
