import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import type { KeyboardEvent, ReactNode } from 'react'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Oculta la columna en pantallas angostas (celular) para que la tabla siga siendo legible. */
    hideOnMobile?: boolean
  }
}

/**
 * Tabla estándar del ERP: cabecera sin fondo, filas separadas por una línea fina y navegación por teclado
 * (↑/↓ recorren las filas, Enter o doble clic abren el registro).
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
                  className={`border-b border-line px-3 py-2.5 text-left text-xs font-normal whitespace-nowrap text-faint first:pl-0 last:pr-0 ${responsive(h.column.columnDef.meta?.hideOnMobile)}`}
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
              onDoubleClick={onOpen ? () => onOpen(row.original) : undefined}
              className={`group border-b border-line outline-none focus-visible:bg-surface-2 focus-visible:shadow-[inset_2px_0_0_var(--accent)] ${isMuted?.(row.original) ? 'text-muted' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`px-3 py-3 align-middle first:pl-0 last:pr-0 ${responsive(cell.column.columnDef.meta?.hideOnMobile)}`}>
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

/** Acciones de una fila: aparecen al pasar el mouse o al enfocar la fila (siempre visibles en pantallas chicas). */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100 max-md:opacity-100">
      {children}
    </div>
  )
}
