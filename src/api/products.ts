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

/**
 * Productos activos que coinciden con el texto (para elegir uno en una línea de compra). Con el proveedor de la
 * compra, cada producto trae el código de ese proveedor.
 */
/** @param linkCode En una compra, el código de la factura que se quiere enlazar: cada producto trae `linkError` si no se puede. */
export const searchProducts = (term: string, supplierId?: string, linkCode?: string) =>
  unwrap(
    api.GET('/api/products', {
      params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsActive: true, SupplierId: supplierId, LinkCode: linkCode } },
    }),
  ).then((r) => r.items)

/**
 * Productos activos enlazados a un proveedor (los que tienen un código suyo) que coinciden con el texto: la primera
 * búsqueda de una línea de compra. Un proveedor que todavía no está registrado no tiene ninguno.
 */
export const searchSupplierProducts = (term: string, supplierId: string | undefined) =>
  supplierId
    ? unwrap(
        api.GET('/api/products', {
          params: { query: { Page: 1, PageSize: 10, SearchTerm: term || undefined, IsActive: true, SupplierId: supplierId, OnlySupplierProducts: true } },
        }),
      ).then((r) => r.items)
    : Promise.resolve([] as ProductRow[])

export type FoundProduct = Schemas['FoundProductDto']

/** El producto que ya usa ese código interno, o null si está libre (la API responde 404). */
export async function findProductByCode(code: string): Promise<FoundProduct | null> {
  const r = await api.GET('/api/products/by-code', { params: { query: { code } } })
  if (r.response.status === 404) return null
  return unwrap(Promise.resolve(r))
}

export function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    // Al editar se envía la versión que se abrió; si otra persona lo cambió mientras tanto, la API responde 409.
    mutationFn: ({ edit, input }: { edit?: { id: string; rowVersion: number }; input: ProductInput }) =>
      edit
        ? unwrap(api.PUT('/api/products/{id}', { params: { path: { id: edit.id } }, body: { ...input, rowVersion: edit.rowVersion } })).then(() => edit.id)
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
const importForm = (file: File, updateExisting: boolean, planVersion?: string) => ({
  body: { File: file as unknown as string, UpdateExisting: updateExisting, PlanVersion: planVersion },
  bodySerializer: (body: { File?: string; UpdateExisting?: boolean; PlanVersion?: string }) => {
    const form = new FormData()
    form.append('File', body.File as unknown as Blob)
    form.append('UpdateExisting', String(body.UpdateExisting ?? false))
    if (body.PlanVersion) form.append('PlanVersion', body.PlanVersion)
    return form
  },
})

export const previewProductImport = (file: File, updateExisting: boolean) =>
  unwrap(api.POST('/api/products/import/preview', importForm(file, updateExisting)))

export function useImportProducts() {
  const qc = useQueryClient()
  return useMutation({
    // planVersion: la huella que dio la revisión; si los productos cambiaron desde entonces, la API responde 409.
    mutationFn: ({ file, updateExisting, planVersion }: { file: File; updateExisting: boolean; planVersion: string }) =>
      unwrap(api.POST('/api/products/import', importForm(file, updateExisting, planVersion))),
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
