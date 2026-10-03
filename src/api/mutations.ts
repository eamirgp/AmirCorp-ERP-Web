import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

/**
 * Activar / desactivar un registro. La fila cambia cuando la API responde y la lista se recarga: el estado y su texto
 * ("Activo", "Inactivo") los dice la API, la pantalla no los adivina. Mientras tanto la fila muestra que está guardando.
 */
export function useToggleActive<T extends { id: string; isActive: boolean }>(
  listKey: QueryKey,
  request: (id: string, active: boolean) => Promise<unknown>,
  /** Otras consultas que dependen del estado (ej.: el catálogo de unidades activas que usan los formularios). */
  alsoInvalidate: QueryKey[] = [],
) {
  const qc = useQueryClient()

  return useMutation<unknown, Error, Pick<T, 'id'> & { active: boolean }>({
    mutationFn: ({ id, active }) => request(id, active),
    // Se recarga todo el recurso (listas y detalles): el detalle muestra quién lo modificó por última vez. Se espera la
    // recarga, así la fila deja de mostrar "guardando" ya con el estado nuevo.
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: listKey.slice(0, 1) }),
        ...alsoInvalidate.map((queryKey) => qc.invalidateQueries({ queryKey })),
      ]),
  })
}
