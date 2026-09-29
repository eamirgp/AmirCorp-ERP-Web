import type { ReactNode } from 'react'
import { Button } from './button'
import { Dialog } from './dialog'

/**
 * Pregunta antes de una acción que cambia algo importante (por ejemplo, desactivar un producto).
 * El botón de confirmar dice exactamente lo que va a pasar; "Cancelar" o Esc no hacen nada.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !pending && onCancel()}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-base text-muted">{children}</div>
    </Dialog>
  )
}
