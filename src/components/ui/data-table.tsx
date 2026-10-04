import * as Menu from '@radix-ui/react-dropdown-menu'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { ChevronUp, MoreHorizontal } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Button } from './button'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Oculta la columna en pantallas angostas (celular) para que la tabla siga siendo legible. */
    hideOnMobile?: boolean
    /** Montos y cantidades: a la derecha, para comparar las cifras. */
    alignRight?: boolean
    /** Campo de orden de la API: la columna se ordena con un clic en su título. */
    sortBy?: string
    /** El primer clic ordena de mayor a menor (fechas: lo más reciente primero, como el Finder). */
    sortDescendingFirst?: boolean
  }
}

/** Orden que se ve en la lista y qué hacer al hacer clic en el título de una columna (la página decide, con `nextSort`). */
export interface TableSort {
  by: string
  descending: boolean
  onSort: (by: string, descendingFirst: boolean) => void
}

/**
 * Tabla estándar del ERP (HIG "Lists and tables"): filas en franjas para seguir los datos de una columna a otra,
 * títulos de columna que ordenan con un clic (otro clic invierte el orden) y navegación por teclado (↑/↓ recorren las
 * filas, Enter o un clic abren el registro).
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onOpen,
  isMuted,
  sort,
}: {
  data: T[]
  // TanStack Table tipa cada columna con su propio valor; la tabla acepta cualquiera.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  getRowId: (row: T) => string
  onOpen?: (row: T) => void
  isMuted?: (row: T) => boolean
  sort?: TableSort
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

  const cellClass = (meta: { hideOnMobile?: boolean; alignRight?: boolean } | undefined) =>
    `${meta?.hideOnMobile ? 'max-md:hidden' : ''} ${meta?.alignRight ? 'text-right' : ''}`

  return (
    // relative: los textos ocultos para lectores de pantalla (sr-only) quedan dentro de este contenedor
    // y no ensanchan la página en celulares.
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const meta = h.column.columnDef.meta
                const sortable = !!(sort && meta?.sortBy)
                const active = sortable && sort!.by === meta!.sortBy
                return (
                  <th
                    key={h.id}
                    aria-sort={active ? (sort!.descending ? 'descending' : 'ascending') : sortable ? 'none' : undefined}
                    className={`h-10 border-b border-rule text-left text-xs font-semibold whitespace-nowrap text-fg-muted ${sortable ? 'px-1.5 first:pl-1.5' : 'px-3 first:pl-4'} last:pr-4 ${cellClass(meta)}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => sort!.onSort(meta!.sortBy!, !!meta!.sortDescendingFirst)}
                        className={`group/sort inline-flex h-8 items-center gap-1 rounded-lg px-2 transition-colors hover:bg-hover hover:text-fg ${meta?.alignRight ? 'flex-row-reverse' : ''} ${active ? 'text-fg' : ''}`}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {/* La flecha se asoma al pasar el mouse para que se note que ordena. */}
                        <ChevronUp
                          aria-hidden
                          strokeWidth={2.5}
                          className={`size-3.5 transition-[opacity,rotate] duration-200 ease-apple ${active ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'} ${active && sort!.descending ? 'rotate-180' : ''}`}
                        />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                )
              })}
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
              className={`group outline-none even:bg-stripe focus-visible:bg-row-hover focus-visible:shadow-[inset_3px_0_0_var(--accent)] ${onOpen ? 'cursor-pointer hover:bg-row-hover' : ''} ${isMuted?.(row.original) ? '[&>td:not(:last-child)]:opacity-55' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`h-13 px-3 py-2 align-middle transition-opacity first:pl-4 last:pr-4 ${cellClass(cell.column.columnDef.meta)}`}>
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

/** Menú de vidrio, el mismo del menú del usuario: lo usan las filas y las barras de filtros. */
export const glassMenuClass =
  'animate-menu-open z-50 min-w-52 origin-(--radix-dropdown-menu-content-transform-origin) rounded-[14px] bg-glass-menu p-1.5 text-fg shadow-menu backdrop-blur-[30px] backdrop-saturate-[1.8]'
// Como en la Mac, la opción bajo el mouse (o elegida con las flechas) se pinta del color de acento con letra blanca,
// también sus íconos y su marca.
export const glassItemClass =
  'relative flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none data-[highlighted]:bg-selected data-[highlighted]:text-selected-ink [&_svg]:size-4 [&_svg]:shrink-0 data-[highlighted]:[&_svg]:!text-selected-ink'

/**
 * Botón "⋯" de una fila con sus acciones escritas en un menú (HIG "Pull-down buttons": una lista de acciones): la tabla
 * queda limpia y cada acción dice con palabras lo que hace. Lo que quita algo va al final, en rojo y separado. Un clic
 * en la fila sigue abriendo el registro.
 */
export function RowMenu({ label, items, busy }: { label: string; items: RowMenuItem[]; busy?: boolean }) {
  const normal = items.filter((i) => !i.danger)
  const danger = items.filter((i) => i.danger)

  return (
    <RowActions>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button size="icon" variant="ghost" loading={busy} aria-label={`Acciones para ${label}`} title="Acciones">
            <MoreHorizontal />
          </Button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" sideOffset={4} className={glassMenuClass}>
            {normal.map((i) => (
              <Menu.Item key={i.label} className={`${glassItemClass} [&_svg]:text-fg-muted`} onSelect={i.onSelect}>
                {i.icon}
                {i.label}
              </Menu.Item>
            ))}
            {danger.length > 0 && normal.length > 0 && <Menu.Separator className="mx-2 my-1.5 h-px bg-hairline" />}
            {danger.map((i) => (
              <Menu.Item key={i.label} className={`${glassItemClass} text-bad`} onSelect={i.onSelect}>
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
