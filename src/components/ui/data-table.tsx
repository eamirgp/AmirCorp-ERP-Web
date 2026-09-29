import * as Menu from '@radix-ui/react-dropdown-menu'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Button } from './button'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Oculta la columna en pantallas angostas (celular) para que la tabla siga siendo legible. */
    hideOnMobile?: boolean
  }
}

/**
 * Tabla estándar del ERP: cabecera sin fondo, filas separadas por una línea fina y navegación por teclado
 * (↑/↓ recorren las filas, Enter o un clic abren el registro).
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onOpen,
  isMuted,
}: {
  data: T[]
  // TanStack Table tipa cada columna con su propio valor; la tabla acepta cualquiera.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  getRowId: (row: T) => string
  onOpen?: (row: T) => void
  isMuted?: (row: T) => boolean
}) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getRowId })

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.target !== e.currentTarget) return
    const tr = e.currentTarget
    if (e.key === 'ArrowDown') (tr.nextElementSibling as HTMLElement | null)?.focus()
    else if (e.key === 'ArrowUp') (tr.previousElementSibling as HTMLElement | null)?.focus()
    else if (e.key === 'Enter' && onOpen) onOpen(row)
    else return
    e.preventDefault()
  }

  const responsive = (hide?: boolean) => (hide ? 'max-md:hidden' : '')

  return (
    // relative: los textos ocultos para lectores de pantalla (sr-only) quedan dentro de este contenedor
    // y no ensanchan la página en celulares.
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-base">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className={`border-y border-line bg-surface-2 px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap text-muted first:pl-4 last:pr-4 ${responsive(h.column.columnDef.meta?.hideOnMobile)}`}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              onKeyDown={(e) => onRowKeyDown(e, row.original)}
              // Un clic en la fila abre el registro (los botones de la fila no, ver RowActions).
              onClick={onOpen ? () => onOpen(row.original) : undefined}
              className={`group border-b border-line outline-none last:border-b-0 focus-visible:bg-surface-2 focus-visible:shadow-[inset_2px_0_0_var(--accent)] ${onOpen ? 'cursor-pointer hover:bg-surface-2' : ''} ${isMuted?.(row.original) ? 'text-muted' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`px-3 py-3 align-middle first:pl-4 last:pr-4 ${responsive(cell.column.columnDef.meta?.hideOnMobile)}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Acciones de una fila, siempre visibles (no hace falta pasar el mouse para descubrirlas).
 * Sus clics no abren el registro: cada botón hace solo lo que dice.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}

export interface RowMenuItem {
  label: string
  icon: ReactNode
  onSelect: () => void
  /** Acción que quita algo (desactivar, anular): se muestra en rojo y separada. */
  danger?: boolean
}

/**
 * Botón "⋯" de una fila con sus acciones escritas en un menú (estilo Stripe/Shopify): la tabla queda limpia y
 * cada acción dice con palabras lo que hace. Un clic en la fila sigue abriendo el registro.
 */
export function RowMenu({ label, items, busy }: { label: string; items: RowMenuItem[]; busy?: boolean }) {
  const normal = items.filter((i) => !i.danger)
  const danger = items.filter((i) => i.danger)
  const itemClass =
    'flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-base outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0'

  return (
    <RowActions>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button size="sm" variant="ghost" loading={busy} aria-label={`Acciones para ${label}`} title="Acciones">
            {!busy && <MoreHorizontal />}
          </Button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" sideOffset={4} className="z-50 min-w-52 rounded-lg border border-line bg-surface p-1 shadow-float">
            {normal.map((i) => (
              <Menu.Item key={i.label} className={`${itemClass} [&_svg]:text-muted`} onSelect={i.onSelect}>
                {i.icon}
                {i.label}
              </Menu.Item>
            ))}
            {danger.length > 0 && normal.length > 0 && <Menu.Separator className="my-1 h-px bg-line" />}
            {danger.map((i) => (
              <Menu.Item key={i.label} className={`${itemClass} text-bad`} onSelect={i.onSelect}>
                {i.icon}
                {i.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </RowActions>
  )
}
