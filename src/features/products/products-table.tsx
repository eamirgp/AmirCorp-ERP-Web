import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, Pencil, Power } from 'lucide-react'
import { useMemo } from 'react'
import type { ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { DataTable, RowActions } from '@/components/ui/data-table'
import { Pill } from '@/components/ui/misc'
import { formatPen } from '@/lib/format'

const col = createColumnHelper<ProductRow>()

export function ProductsTable({
  rows,
  onEdit,
  onToggle,
  onHistory,
}: {
  rows: ProductRow[]
  onEdit: (p: ProductRow) => void
  onToggle: (p: ProductRow) => void
  onHistory: (p: ProductRow) => void
}) {
  const columns = useMemo(
    () => [
      col.accessor('code', { header: 'Código', cell: (c) => <span className="font-mono text-xs whitespace-nowrap text-muted">{c.getValue()}</span> }),
      col.accessor('name', { header: 'Producto' }),
      col.accessor('unitOfMeasureDescription', { header: 'Unidad', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('igvAffectationDescription', { header: 'IGV', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('salePrice', {
        header: () => <span className="block text-right">Precio</span>,
        cell: (c) => <span className="num block text-right">{formatPen(Number(c.getValue()))}</span>,
      }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => (c.getValue() ? <Pill tone="ok">Activo</Pill> : <Pill tone="neutral">Inactivo</Pill>) }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => (
          <RowActions>
            <Button size="sm" variant="ghost" onClick={() => onEdit(c.row.original)} aria-label={`Editar ${c.row.original.name}`}>
              <Pencil />
              <span className="max-md:sr-only">Editar</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(c.row.original)}>
              <Power />
              <span className="max-md:sr-only">{c.row.original.isActive ? 'Desactivar' : 'Activar'}</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onHistory(c.row.original)} aria-label={`Historial de ${c.row.original.name}`} title="Historial">
              <HistoryIcon />
            </Button>
          </RowActions>
        ),
      }),
    ],
    [onEdit, onToggle, onHistory],
  )

  return <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={onEdit} isMuted={(r) => !r.isActive} />
}
