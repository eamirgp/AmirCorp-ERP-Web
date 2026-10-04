import * as Menu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'
import { glassItemClass, glassMenuClass, useClickMenu } from './menu'

export interface MenuAction {
  label: string
  icon: ReactNode
  onSelect: () => void
  /** Acción que quita algo (desactivar, eliminar): se muestra en rojo, al final y separada. */
  danger?: boolean
  /** Se ve pero no se puede elegir (por ejemplo, "Usar los filtros de ahora" cuando ya son los mismos). */
  disabled?: boolean
}

/**
 * Botón "⋯" con acciones escritas en un menú de vidrio (HIG "Pull-down buttons": una lista de acciones). Lo que quita
 * algo va al final, en rojo y separado. Lo usan las filas de una tabla, el administrador de vistas y, en el celular, el
 * encabezado de una pantalla (con `glass`, el botón redondo de vidrio de las barras de Apple).
 */
export function MoreMenu({ label, items, busy, glass = false }: { label: string; items: MenuAction[]; busy?: boolean; glass?: boolean }) {
  const normal = items.filter((i) => !i.danger)
  const danger = items.filter((i) => i.danger)
  const menu = useClickMenu()

  return (
    <Menu.Root {...menu.root}>
      <Menu.Trigger asChild {...menu.trigger}>
        <Button size="icon" variant={glass ? 'glass' : 'ghost'} loading={busy} aria-label={label} title={label}>
          <MoreHorizontal />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content {...menu.content} align="end" sideOffset={6} className={glassMenuClass}>
          {normal.map((i) => (
            <Menu.Item
              key={i.label}
              disabled={i.disabled}
              className={`${glassItemClass} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 [&_svg]:text-fg-muted`}
              onSelect={i.onSelect}
            >
              {i.icon}
              {i.label}
            </Menu.Item>
          ))}
          {danger.length > 0 && normal.length > 0 && <Menu.Separator className="mx-2 my-1.5 h-px bg-hairline" />}
          {danger.map((i) => (
            <Menu.Item key={i.label} disabled={i.disabled} className={`${glassItemClass} text-bad data-[disabled]:opacity-40`} onSelect={i.onSelect}>
              {i.icon}
              {i.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
