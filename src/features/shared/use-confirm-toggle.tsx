import type { UseMutationResult } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { errorText } from '@/api/client'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'

type Toggle = UseMutationResult<unknown, Error, { id: string; active: boolean }, unknown>

/**
 * Activar o desactivar un registro desde una lista.
 * - Desactivar pregunta antes (el diálogo explica qué pasa); activar no, porque no quita nada.
 * - Mientras se guarda, `busyId` indica qué fila tiene el botón bloqueado: así un doble clic no cruza los cambios.
 */
export function useConfirmToggle<T extends { id: string; isActive: boolean }>(
  toggle: Toggle,
  copy: {
    /** Título de la confirmación: "¿Desactivar este producto?" */
    title: string
    /** Qué pasa al desactivarlo, con el nombre del registro. */
    body: (row: T) => ReactNode
    /** Aviso al terminar: "LIM-005 desactivado". */
    done: (row: T, active: boolean) => string
  },
) {
  const [confirming, setConfirming] = useState<T | null>(null)

  // Con mutateAsync cada clic tiene su propio aviso: con mutate y sus callbacks, si se activan dos filas seguidas,
  // solo avisa la última.
  const run = (row: T) => {
    const active = !row.isActive
    toggle
      .mutateAsync({ id: row.id, active })
      .then(() => toast.ok(copy.done(row, active)))
      .catch((e: unknown) => toast.error(errorText(e)))
      .finally(() => setConfirming(null))
  }

  const request = (row: T) => (row.isActive ? setConfirming(row) : run(row))
  const busyId = toggle.isPending ? toggle.variables?.id : undefined

  const dialog = (
    <ConfirmDialog
      open={confirming !== null}
      title={copy.title}
      confirmLabel="Desactivar"
      pending={toggle.isPending}
      onConfirm={() => confirming && run(confirming)}
      onCancel={() => setConfirming(null)}
    >
      {confirming && copy.body(confirming)}
    </ConfirmDialog>
  )

  return { request, busyId, dialog }
}
