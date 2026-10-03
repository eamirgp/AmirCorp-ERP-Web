import * as RadixDialog from '@radix-ui/react-dialog'
import { useRef, type ReactNode } from 'react'
import { LogoMark } from '@/brand/logo'
import { Button } from './button'

/**
 * Alerta que confirma una acción que pierde algo y no se puede deshacer (HIG "Alerts"): salir sin guardar, cambiar el
 * proveedor de una compra a medio llenar. Lo que se puede deshacer (desactivar) no pregunta (decisión 14).
 * Como en la Mac: el ícono de la marca, un título que describe la situación, un texto corto y dos botones del mismo
 * tamaño. El de confirmar dice exactamente lo que va a pasar, en rojo; el foco empieza en "Cancelar", para que Enter
 * no confirme sin leer. Esc también cancela.
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
  const cancel = useRef<HTMLButtonElement>(null)
  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => !o && !pending && onCancel()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-dim data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <RadixDialog.Content
            role="alertdialog"
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              cancel.current?.focus()
            }}
            className="animate-sheet-in pointer-events-auto flex w-full max-w-[340px] flex-col items-center gap-2.5 rounded-[22px] bg-glass-menu p-6 text-center text-fg shadow-sheet backdrop-blur-[30px] focus:outline-none"
          >
            <span aria-hidden className="mb-1 flex size-[52px] items-center justify-center rounded-[13px] border border-[#e8e8ed] bg-white shadow-[0_2px_8px_rgb(29_29_31/0.10)]">
              <LogoMark height={26} tone="light" />
            </span>
            <RadixDialog.Title className="text-lg font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Description asChild>
              <div className="text-sm text-fg-muted">{children}</div>
            </RadixDialog.Description>
            {/* Con un texto corto, los dos botones lado a lado; con uno largo, uno sobre otro, como la Mac: el de
                confirmar arriba y "Cancelar" abajo. */}
            <div className={`mt-2.5 grid w-full gap-2.5 ${confirmLabel.length <= 12 ? 'grid-cols-2' : 'grid-cols-1 [&>:first-child]:order-last'}`}>
              <Button ref={cancel} onClick={onCancel} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={onConfirm} loading={pending}>
                {confirmLabel}
              </Button>
            </div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
