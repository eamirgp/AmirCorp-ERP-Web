import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

/**
 * Activar / desactivar un registro con actualización optimista: la fila cambia al instante en todas
 * las listas en caché y se revierte si la API rechaza el cambio.
 */
export function useToggleActive<T extends { id: string; isActive: boolean }>(
  listKey: QueryKey,
  request: (id: string, active: boolean) => Promise<unknown>,
) {
  const qc = useQueryClient()

  const patch = (data: unknown, id: string, active: boolean): unknown => {
    const update = (rows: T[]) => rows.map((r) => (r.id === id ? { ...r, isActive: active } : r))
    if (Array.isArray(data)) return update(data as T[])
    if (data && typeof data === 'object' && 'items' in data) return { ...data, items: update((data as { items: T[] }).items) }
    return data
  }

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => request(id, active),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: listKey })
      const snapshot = qc.getQueriesData({ queryKey: listKey })
      qc.setQueriesData({ queryKey: listKey }, (old: unknown) => patch(old, id, active))
      return { snapshot }
    },
    onError: (_e, _v, context) => context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)),
    // Se recarga todo el recurso (listas y detalles): el detalle muestra quién lo modificó por última vez.
    onSettled: () => qc.invalidateQueries({ queryKey: listKey.slice(0, 1) }),
  })
}
