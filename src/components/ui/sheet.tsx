import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Panel lateral que flota a la derecha, para consultar o filtrar sin salir de la lista (filtros, historial). Es el
 * mismo vidrio gris del menú lateral, con esquinas redondeadas y separado del borde. Accesible como un diálogo: foco
 * atrapado, Esc para cerrar. En celular ocupa casi todo el ancho.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** Botones fijos al pie del panel (ej.: "Quitar todos" y "Listo"). */
  footer?: ReactNode
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-veil data-[state=open]:animate-[fade-in_300ms_ease-out]" />
        <RadixDialog.Content className="animate-panel-in-right fixed inset-y-2.5 right-2.5 z-50 flex w-[min(420px,calc(100%-20px))] flex-col rounded-[22px] border border-glass-line bg-sidebar text-fg shadow-glass backdrop-blur-[30px] backdrop-saturate-[1.8] focus:outline-none">
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="font-display text-xl font-bold tracking-[-0.015em]">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm break-words text-fg-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-glass text-fg shadow-[0_0_0_1px_var(--glass-line)] hover:bg-white" aria-label="Cerrar">
              <X className="size-[18px]" />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-hairline px-5 py-4">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
