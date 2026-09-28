import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Pencil, Power } from 'lucide-react'
import { useMemo, type KeyboardEvent } from 'react'
import type { ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/misc'
import { formatPen } from '@/lib/format'

const col = createColumnHelper<ProductRow>()

export function ProductsTable({
  rows,
  onEdit,
  onToggle,
}: {
  rows: ProductRow[]
  onEdit: (p: ProductRow) => void
  onToggle: (p: ProductRow) => void
}) {
  const columns = useMemo(
    () => [
      col.accessor('code', {
        header: 'Código',
        cell: (c) => <span className="font-mono text-[12.5px] text-muted">{c.getValue()}</span>,
      }),
      col.accessor('name', { header: 'Producto', cell: (c) => <span>{c.getValue()}</span> }),
      col.accessor('unitOfMeasureDescription', { header: 'Unidad', cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('igvAffectationDescription', { header: 'IGV', cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('salePrice', {
        header: () => <span className="block text-right">Precio</span>,
        cell: (c) => <span className="num block text-right">{formatPen(Number(c.getValue()))}</span>,
      }),
      col.accessor('isActive', {
        header: 'Estado',
        cell: (c) => (c.getValue() ? <Pill tone="ok">Activo</Pill> : <Pill tone="neutral">Inactivo</Pill>),
      }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => (
          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-focus-visible:opacity-100 max-md:opacity-100">
            <Button size="sm" variant="ghost" onClick={() => onEdit(c.row.original)} aria-label={`Editar ${c.row.original.name}`}>
              <Pencil />
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(c.row.original)}>
              <Power />
              {c.row.original.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        ),
      }),
    ],
    [onEdit, onToggle],
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })

  // ↑/↓ recorren las filas y Enter abre el producto, sin tocar el mouse.
  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, product: ProductRow) => {
    if (e.target !== e.currentTarget) return
    const row = e.currentTarget
    if (e.key === 'ArrowDown') (row.nextElementSibling as HTMLElement | null)?.focus()
    else if (e.key === 'ArrowUp') (row.previousElementSibling as HTMLElement | null)?.focus()
    else if (e.key === 'Enter') onEdit(product)
    else return
    e.preventDefault()
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="border-b border-line px-3 py-2.5 text-left text-[12.5px] font-normal whitespace-nowrap text-faint first:pl-0 last:pr-0">
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
              onDoubleClick={() => onEdit(row.original)}
              className={`group border-b border-line outline-none focus-visible:bg-surface-2 focus-visible:shadow-[inset_2px_0_0_var(--accent)] ${row.original.isActive ? '' : 'text-muted'}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-3 align-middle first:pl-0 last:pr-0">
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
