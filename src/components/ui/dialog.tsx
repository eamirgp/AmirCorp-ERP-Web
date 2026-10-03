import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Ventana modal accesible: foco atrapado, Esc para cerrar, foco inicial en el primer campo y lectura correcta por lectores de pantalla.
 * Para no perder lo escrito: un clic fuera no la cierra, Esc no la cierra si ya se escribió algo (se cierra con
 * Cancelar o la X), y mientras guarda (un botón con `loading`) no se cierra de ninguna forma.
 */
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
  const content = useRef<HTMLDivElement>(null)
  // Si se escribió o eligió algo desde que se abrió.
  const edited = useRef(false)
  useEffect(() => {
    if (open) edited.current = false
  }, [open])

  const saving = () => !!content.current?.querySelector('[aria-busy="true"]')

  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => (o || !saving()) && onOpenChange(o)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <RadixDialog.Content
          ref={content}
          onInput={() => (edited.current = true)}
          onChange={() => (edited.current = true)}
          // Un clic fuera de la ventana (por ejemplo, para cambiar de programa) no la cierra.
          onInteractOutside={(e) => e.preventDefault()}
          // Al abrir, el foco va al primer campo (para escribir de inmediato) y no a la X de cerrar. Sin campos,
          // Radix enfoca el primer botón.
          onOpenAutoFocus={(e) => {
            const field = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
              'input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)',
            )
            if (field) {
              e.preventDefault()
              field.focus()
            }
          }}
          // Esc en un buscador con la lista abierta cierra solo la lista (lo hace el buscador); el siguiente Esc cierra la
          // ventana. Radix escucha Esc antes que el campo, por eso se revisa aquí.
          onEscapeKeyDown={(e) => {
            if (e.target instanceof Element && e.target.closest('[role="combobox"][aria-expanded="true"]')) e.preventDefault()
            // Con algo escrito, Esc no lo borra todo de golpe: se cierra con Cancelar o la X.
            else if (edited.current || saving()) e.preventDefault()
          }}
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
