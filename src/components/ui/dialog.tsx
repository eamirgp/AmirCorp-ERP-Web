import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Ventana modal accesible: foco atrapado, Esc para cerrar y lectura correcta por lectores de pantalla. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <RadixDialog.Content
          className={`fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[calc(100%-32px)] ${width} -translate-x-1/2 flex-col rounded-xl border border-line bg-surface shadow-float focus:outline-none data-[state=open]:animate-[pop-in_140ms_ease-out]`}
        >
          <div className="flex items-start gap-3 px-6 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="font-display text-lg font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-sm text-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Cerrar">
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-6 py-3">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 px-6 pt-3 pb-5">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
