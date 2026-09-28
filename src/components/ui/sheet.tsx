import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Panel lateral que entra por la derecha, para consultar algo sin salir de la lista (ej.: el historial).
 * Accesible como un diálogo: foco atrapado, Esc para cerrar. En celular ocupa toda la pantalla.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <RadixDialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-float focus:outline-none data-[state=open]:animate-[slide-in-right_160ms_ease-out]">
          <div className="flex items-start gap-3 border-b border-line px-6 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="font-display text-lg font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-sm break-words text-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Cerrar">
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
