import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Ventana de un formulario, como las hojas de la Mac (HIG "Sheets"): una tarjeta blanca de esquinas redondeadas sobre
 * la pantalla atenuada, con Cancelar y el botón principal abajo a la derecha.
 * Accesible: foco atrapado, foco inicial en el primer campo y lectura correcta por lectores de pantalla.
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
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-dim data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        {/* El centrado va en un contenedor aparte: así la animación de entrada (transform) no lo pisa. */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh]">
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
            // ventana. Lo mismo en un campo marcado con `data-own-escape`, que usa Esc para lo suyo (por ejemplo, dejar de
            // renombrar una vista). Radix escucha Esc antes que el campo, por eso se revisa aquí.
            onEscapeKeyDown={(e) => {
              if (e.target instanceof Element && e.target.closest('[role="combobox"][aria-expanded="true"], [data-own-escape]')) e.preventDefault()
              // Con algo escrito, Esc no lo borra todo de golpe: se cierra con Cancelar o la X.
              else if (edited.current || saving()) e.preventDefault()
            }}
            className={`animate-sheet-in pointer-events-auto flex max-h-[84vh] w-full ${width} flex-col rounded-3xl bg-page text-fg shadow-sheet focus:outline-none`}
          >
            <div className="flex items-start gap-3 px-6 pt-6 pb-2">
              <div className="min-w-0 flex-1">
                <RadixDialog.Title className="font-display text-title font-bold tracking-[-0.02em]">{title}</RadixDialog.Title>
                {description ? (
                  <RadixDialog.Description className="mt-1 text-sm break-words text-fg-muted">{description}</RadixDialog.Description>
                ) : (
                  <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
                )}
              </div>
              <RadixDialog.Close className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-muted-fill text-fg hover:bg-fill" aria-label="Cerrar">
                <X className="size-[18px]" />
              </RadixDialog.Close>
            </div>
            <div className="min-h-0 overflow-y-auto px-6 py-4">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 px-6 pt-3 pb-6">{footer}</div>}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
