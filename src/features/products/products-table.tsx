import { createColumnHelper } from '@tanstack/react-table'
import { Pencil, Power } from 'lucide-react'
import { useMemo } from 'react'
import type { ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { DataTable, RowActions } from '@/components/ui/data-table'
import { Pill } from '@/components/ui/misc'
import { formatPen } from '@/lib/format'

const col = createColumnHelper<ProductRow>()

export function ProductsTable({ rows, onEdit, onToggle }: { rows: ProductRow[]; onEdit: (p: ProductRow) => void; onToggle: (p: ProductRow) => void }) {
  const columns = useMemo(
    () => [
      col.accessor('code', { header: 'Código', cell: (c) => <span className="font-mono text-xs text-muted">{c.getValue()}</span> }),
      col.accessor('name', { header: 'Producto' }),
      col.accessor('unitOfMeasureDescription', { header: 'Unidad', cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('igvAffectationDescription', { header: 'IGV', cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
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
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(c.row.original)}>
              <Power />
              {c.row.original.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </RowActions>
        ),
      }),
    ],
    [onEdit, onToggle],
  )

  return <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={onEdit} isMuted={(r) => !r.isActive} />
}
