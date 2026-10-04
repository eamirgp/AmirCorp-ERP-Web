import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'

/** Menú de vidrio, el mismo del menú del usuario: lo usan las filas, las barras de filtros y las listas desplegables. */
export const glassMenuClass =
  'animate-menu-open z-50 min-w-52 origin-(--radix-dropdown-menu-content-transform-origin) rounded-[14px] bg-glass-menu p-1.5 text-fg shadow-menu backdrop-blur-[30px] backdrop-saturate-[1.8]'

// Como en la Mac, la opción bajo el mouse (o elegida con las flechas) se pinta del color de acento con letra blanca,
// también sus íconos y su marca.
export const glassItemClass =
  'relative flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none data-[highlighted]:bg-selected data-[highlighted]:text-selected-ink [&_svg]:size-4 [&_svg]:shrink-0 data-[highlighted]:[&_svg]:!text-selected-ink'

/**
 * Un menú que se abre al soltar el clic, no al presionar (decisión 18). Radix abre sus menús al presionar el botón del
 * mouse; aquí ese paso se cancela y el clic completo abre o cierra el menú. Un clic afuera lo cierra (Radix), salvo en su
 * propio botón, que lo maneja el clic. El menú no es "modal": así el clic siempre le llega al botón y se comporta igual
 * cada vez. El teclado (Enter, espacio, flecha abajo, Esc) lo sigue manejando Radix.
 *
 * Uso: `const menu = useClickMenu()`, luego `<Menu.Root {...menu.root}>`, `<Menu.Trigger {...menu.trigger}>` y
 * `<Menu.Content {...menu.content}>`.
 */
export function useClickMenu() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return {
    open,
    root: { open, onOpenChange: setOpen, modal: false },
    trigger: {
      ref: triggerRef,
      onPointerDown: (e: PointerEvent) => {
        // Con el botón principal, Radix abriría o cerraría aquí: se lo impide (respeta `defaultPrevented`).
        if (e.button === 0 && !e.ctrlKey) e.preventDefault()
      },
      onClick: (e: MouseEvent) => {
        // Un "clic" del teclado (Enter o espacio, detail 0) ya lo manejó Radix.
        if (e.detail === 0) return
        setOpen((o) => !o)
      },
    },
    content: {
      // Presionar sobre el botón del menú no cuenta como "afuera": su clic lo cierra.
      onInteractOutside: (e: Event) => {
        if (e.target instanceof Node && triggerRef.current?.contains(e.target)) e.preventDefault()
      },
    },
  }
}
