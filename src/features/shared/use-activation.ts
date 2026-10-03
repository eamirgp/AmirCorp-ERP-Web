import type { UseMutationResult } from '@tanstack/react-query'
import { errorText } from '@/api/client'
import { toast } from '@/components/ui/toast'

type Toggle = UseMutationResult<unknown, Error, { id: string; active: boolean }, unknown>

/**
 * Activar o desactivar un registro desde una lista. No pregunta antes (decisiÃ³n 14): desactivar se deshace activando, y
 * la guÃ­a de Apple pide no interrumpir con una alerta lo que se puede deshacer. La fila queda atenuada y un aviso dice
 * lo que pasÃ³.
 * Mientras se guarda, `busyId` indica quÃ© fila tiene el botÃ³n bloqueado: asÃ­ un doble clic no cruza los cambios.
 */
export function useActivation<T extends { id: string; isActive: boolean }>(
  toggle: Toggle,
  /** Aviso al terminar: "LIM-005 desactivado". */
  done: (row: T, active: boolean) => string,
) {
  // Con mutateAsync cada clic tiene su propio aviso: con mutate y sus callbacks, si se activan dos filas seguidas,
  // solo avisa la Ãºltima.
  const request = (row: T) => {
    const active = !row.isActive
    toggle
      .mutateAsync({ id: row.id, active })
      .then(() => toast.ok(done(row, active)))
      .catch((e: unknown) => toast.error(errorText(e)))
  }

  const busyId = toggle.isPending ? toggle.variables?.id : undefined

  return { request, busyId }
}
